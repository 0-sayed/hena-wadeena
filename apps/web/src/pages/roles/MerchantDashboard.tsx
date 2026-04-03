import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Building2, CheckCircle, Clock, Inbox, Package2, Store } from 'lucide-react';
import { toast } from 'sonner';

import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { StatCard } from '@/components/dashboard/StatCard';
import { useListingInquiriesReceived } from '@/hooks/use-listing-inquiries';
import { useMyBusinesses } from '@/hooks/use-my-businesses';
import { useMyListings } from '@/hooks/use-my-listings';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { DISTRICTS, districtLabel, formatPrice } from '@/lib/format';
import { pickLocalizedCopy, pickLocalizedField, type AppLanguage } from '@/lib/localization';
import { parseEgpInputToPiasters } from '@/lib/wallet-store';
import { listingsAPI } from '@/services/api';

const verificationLabels: Record<string, { ar: string; en: string }> = {
  verified: { ar: 'موثق', en: 'Verified' },
  pending: { ar: 'قيد المراجعة', en: 'Under review' },
  rejected: { ar: 'مرفوض', en: 'Rejected' },
  suspended: { ar: 'موقوف', en: 'Suspended' },
};

const inquiryStatusLabels: Record<'pending' | 'read' | 'replied', { ar: string; en: string }> = {
  pending: { ar: 'غير مقروء', en: 'Unread' },
  read: { ar: 'تمت القراءة', en: 'Read' },
  replied: { ar: 'تم الرد', en: 'Replied' },
};

const listingStatusLabels: Record<string, { ar: string; en: string }> = {
  active: { ar: 'نشط', en: 'Active' },
  inactive: { ar: 'غير نشط', en: 'Inactive' },
  draft: { ar: 'مسودة', en: 'Draft' },
  pending: { ar: 'قيد المراجعة', en: 'Pending' },
  sold: { ar: 'تم البيع', en: 'Sold' },
  rented: { ar: 'تم التأجير', en: 'Rented' },
};

const listingCategories = [
  { value: 'shopping', ar: 'تسوق', en: 'Shopping' },
  { value: 'service', ar: 'خدمات', en: 'Services' },
  { value: 'healthcare', ar: 'رعاية صحية', en: 'Healthcare' },
  { value: 'education', ar: 'تعليم', en: 'Education' },
];

type ListingFormState = {
  id?: string;
  titleAr: string;
  description: string;
  priceEgp: string;
  district: string;
  category: string;
  address: string;
};

const emptyListingForm: ListingFormState = {
  titleAr: '',
  description: '',
  priceEgp: '',
  district: DISTRICTS[0]?.id ?? 'kharga',
  category: 'shopping',
  address: '',
};

function formatAmountWithCurrency(value: number, language: AppLanguage): string {
  return `${formatPrice(value)} ${pickLocalizedCopy(language, { ar: 'ج.م', en: 'EGP' })}`;
}

function listingStatusLabel(status: string, language: AppLanguage) {
  const labels = listingStatusLabels[status];
  return labels ? pickLocalizedCopy(language, labels) : status;
}

export default function MerchantDashboard() {
  const queryClient = useQueryClient();
  const { language } = useAuth();
  const appLanguage: AppLanguage = language === 'en' ? 'en' : 'ar';
  const {
    data: businessesData,
    isLoading: loadingBusinesses,
    error: businessesError,
  } = useMyBusinesses();
  const { data: listingsData, isLoading: loadingListings } = useMyListings();
  const {
    data: inquiriesData,
    isLoading: loadingInquiries,
    isError: inquiriesError,
  } = useListingInquiriesReceived({ limit: 5 });
  const [listingForm, setListingForm] = useState<ListingFormState>(emptyListingForm);
  const [isListingDialogOpen, setIsListingDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const isSavingRef = useRef(false);

  const businesses = businessesData ?? [];
  const listings = listingsData ?? [];
  const inquiries = inquiriesData?.data ?? [];

  const stats = {
    totalBusinesses: businesses.length,
    verifiedBusinesses: businesses.filter((business) => business.verificationStatus === 'verified')
      .length,
    pendingBusinesses: businesses.filter((business) => business.verificationStatus === 'pending')
      .length,
    listings: listings.length,
    receivedInquiries: inquiriesData?.total ?? 0,
  };

  const refreshMerchantData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['market', 'businesses', 'mine'] }),
      queryClient.invalidateQueries({ queryKey: ['market', 'listings', 'mine'] }),
      queryClient.invalidateQueries({ queryKey: ['market', 'listings'] }),
      queryClient.invalidateQueries({ queryKey: ['market', 'listing-inquiries'] }),
    ]);
  };

  const openCreateListingDialog = () => {
    setListingForm((prev) => (prev.id ? emptyListingForm : prev));
    setIsListingDialogOpen(true);
  };

  const openEditListingDialog = (listing: {
    id: string;
    titleAr: string;
    description: string | null;
    price: number;
    district: string | null;
    category: string;
    address: string | null;
  }) => {
    setListingForm({
      id: listing.id,
      titleAr: listing.titleAr,
      description: listing.description ?? '',
      priceEgp: String(listing.price / 100),
      district: listing.district ?? emptyListingForm.district,
      category: listing.category,
      address: listing.address ?? '',
    });
    setIsListingDialogOpen(true);
  };

  const handleSaveListing = async () => {
    if (isSavingRef.current) return;

    const price = parseEgpInputToPiasters(listingForm.priceEgp);
    if (!listingForm.titleAr.trim()) {
      toast.error(
        pickLocalizedCopy(appLanguage, {
          ar: 'اسم المنتج أو الخدمة مطلوب',
          en: 'Listing name is required',
        }),
      );
      return;
    }
    if (price == null) {
      toast.error(
        pickLocalizedCopy(appLanguage, {
          ar: 'أدخل سعرًا صحيحًا',
          en: 'Enter a valid price',
        }),
      );
      return;
    }

    isSavingRef.current = true;
    setSaving(true);
    try {
      const payload = {
        listingType: 'business' as const,
        transaction: 'sale' as const,
        titleAr: listingForm.titleAr.trim(),
        description: listingForm.description.trim() || undefined,
        category: listingForm.category,
        price,
        priceUnit: 'piece',
        district: listingForm.district,
        address: listingForm.address.trim() || undefined,
      };

      if (listingForm.id) {
        await listingsAPI.update(listingForm.id, payload);
      } else {
        await listingsAPI.create(payload);
      }

      setListingForm(emptyListingForm);
      setIsListingDialogOpen(false);
      await refreshMerchantData();
      toast.success(
        listingForm.id
          ? pickLocalizedCopy(appLanguage, {
              ar: 'تم تحديث الإعلان',
              en: 'Listing updated',
            })
          : pickLocalizedCopy(appLanguage, {
              ar: 'تمت إضافة الإعلان',
              en: 'Listing added',
            }),
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : pickLocalizedCopy(appLanguage, {
              ar: 'تعذر حفظ الإعلان',
              en: 'Unable to save the listing',
            });
      toast.error(message);
    } finally {
      isSavingRef.current = false;
      setSaving(false);
    }
  };

  const handleDeleteListing = async (id: string) => {
    try {
      await listingsAPI.remove(id);
      await refreshMerchantData();
      if (listingForm.id === id) {
        setListingForm(emptyListingForm);
      }
      toast.success(
        pickLocalizedCopy(appLanguage, {
          ar: 'تم حذف الإعلان',
          en: 'Listing deleted',
        }),
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : pickLocalizedCopy(appLanguage, {
              ar: 'تعذر حذف الإعلان',
              en: 'Unable to delete the listing',
            });
      toast.error(message);
    }
  };

  return (
    <DashboardShell
      icon={Store}
      title={pickLocalizedCopy(appLanguage, { ar: 'لوحة التاجر', en: 'Merchant dashboard' })}
      subtitle={pickLocalizedCopy(appLanguage, {
        ar: 'إدارة نشاطك التجاري، إعلاناتك، والاستفسارات الواردة من المهتمين',
        en: 'Manage your business activity, listings, and incoming inquiries',
      })}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label={pickLocalizedCopy(appLanguage, { ar: 'الأنشطة التجارية', en: 'Businesses' })}
          value={loadingBusinesses ? '...' : stats.totalBusinesses}
          icon={Building2}
        />
        <StatCard
          label={pickLocalizedCopy(appLanguage, { ar: 'أنشطة موثقة', en: 'Verified businesses' })}
          value={loadingBusinesses ? '...' : stats.verifiedBusinesses}
          icon={CheckCircle}
          variant="success"
        />
        <StatCard
          label={pickLocalizedCopy(appLanguage, {
            ar: 'أنشطة قيد المراجعة',
            en: 'Businesses under review',
          })}
          value={loadingBusinesses ? '...' : stats.pendingBusinesses}
          icon={Clock}
          variant="warning"
        />
        <StatCard
          label={pickLocalizedCopy(appLanguage, { ar: 'إعلاناتي', en: 'My listings' })}
          value={loadingListings ? '...' : stats.listings}
          icon={Package2}
        />
        <StatCard
          label={pickLocalizedCopy(appLanguage, { ar: 'استفسارات واردة', en: 'Incoming inquiries' })}
          value={loadingInquiries ? '...' : stats.receivedInquiries}
          icon={Inbox}
          variant="warning"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{pickLocalizedCopy(appLanguage, { ar: 'أنشطتي التجارية', en: 'My businesses' })}</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingBusinesses ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 w-full" />
                ))}
              </div>
            ) : businessesError ? (
              <p className="text-sm text-destructive">
                {pickLocalizedCopy(appLanguage, {
                  ar: 'حدث خطأ في تحميل الأنشطة التجارية',
                  en: 'There was an error loading your businesses',
                })}
              </p>
            ) : businesses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {pickLocalizedCopy(appLanguage, {
                  ar: 'لم تسجل أي نشاط تجاري بعد.',
                  en: 'No businesses yet.',
                })}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{pickLocalizedCopy(appLanguage, { ar: 'النشاط', en: 'Business' })}</TableHead>
                    <TableHead>{pickLocalizedCopy(appLanguage, { ar: 'التصنيف', en: 'Category' })}</TableHead>
                    <TableHead>{pickLocalizedCopy(appLanguage, { ar: 'المنطقة', en: 'District' })}</TableHead>
                    <TableHead>{pickLocalizedCopy(appLanguage, { ar: 'الحالة', en: 'Status' })}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {businesses.map((business) => {
                    const status = verificationLabels[business.verificationStatus] ?? verificationLabels.pending;

                    return (
                      <TableRow key={business.id}>
                        <TableCell className="font-medium">
                          {pickLocalizedField(appLanguage, { ar: business.nameAr, en: business.nameEn })}
                        </TableCell>
                        <TableCell>{business.category}</TableCell>
                        <TableCell>{districtLabel(business.district ?? '', appLanguage) || '-'}</TableCell>
                        <TableCell>
                          <span className="rounded-full bg-muted px-3 py-1 text-xs">
                            {pickLocalizedCopy(appLanguage, status)}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {pickLocalizedCopy(appLanguage, { ar: 'إضافة إعلان جديد', en: 'Add a new listing' })}
            </CardTitle>
            <CardDescription>
              {pickLocalizedCopy(appLanguage, {
                ar: 'افتح نافذة منبثقة لإضافة إعلان جديد أو تعديل إعلان حالي دون تغيير تخطيط الصفحة.',
                en: 'Open a modal to add a new listing or edit an existing one without shifting the page layout.',
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {pickLocalizedCopy(appLanguage, {
                ar: 'استخدم الزر التالي لفتح نموذج الإعلان في نافذة مستقلة. يمكنك أيضاً تعديل أي إعلان من الجدول أدناه بنفس النافذة.',
                en: 'Use the button below to open the listing form in a dedicated modal. You can also edit any listing from the table below using the same dialog.',
              })}
            </p>
            <Button onClick={openCreateListingDialog}>
              {pickLocalizedCopy(appLanguage, { ar: 'إضافة إعلان', en: 'Add advertisement' })}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isListingDialogOpen} onOpenChange={setIsListingDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {listingForm.id
                ? pickLocalizedCopy(appLanguage, { ar: 'تعديل إعلان', en: 'Edit listing' })
                : pickLocalizedCopy(appLanguage, { ar: 'إضافة إعلان جديد', en: 'Add a new listing' })}
            </DialogTitle>
            <DialogDescription>
              {pickLocalizedCopy(appLanguage, {
                ar: 'أضف منتجاً أو خدمة مع السعر والموقع، ثم احفظ التغييرات لإظهارها في قائمتك.',
                en: 'Add a product or service with pricing and location, then save to update your listings.',
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="listingTitle">{pickLocalizedCopy(appLanguage, { ar: 'الاسم', en: 'Name' })}</Label>
              <Input
                id="listingTitle"
                value={listingForm.titleAr}
                onChange={(event) =>
                  setListingForm((prev) => ({ ...prev, titleAr: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="listingPrice">{pickLocalizedCopy(appLanguage, { ar: 'السعر (جنيه)', en: 'Price (EGP)' })}</Label>
                <Input
                  id="listingPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={listingForm.priceEgp}
                  onChange={(event) =>
                    setListingForm((prev) => ({ ...prev, priceEgp: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{pickLocalizedCopy(appLanguage, { ar: 'التصنيف', en: 'Category' })}</Label>
                <Select
                  value={listingForm.category}
                  onValueChange={(value) =>
                    setListingForm((prev) => ({ ...prev, category: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {listingCategories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {pickLocalizedCopy(appLanguage, category)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{pickLocalizedCopy(appLanguage, { ar: 'المنطقة', en: 'District' })}</Label>
                <Select
                  value={listingForm.district}
                  onValueChange={(value) =>
                    setListingForm((prev) => ({ ...prev, district: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DISTRICTS.map((district) => (
                      <SelectItem key={district.id} value={district.id}>
                        {districtLabel(district.id, appLanguage)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="listingAddress">{pickLocalizedCopy(appLanguage, { ar: 'العنوان', en: 'Address' })}</Label>
                <Input
                  id="listingAddress"
                  value={listingForm.address}
                  onChange={(event) =>
                    setListingForm((prev) => ({ ...prev, address: event.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="listingDescription">{pickLocalizedCopy(appLanguage, { ar: 'الوصف', en: 'Description' })}</Label>
              <Textarea
                id="listingDescription"
                rows={4}
                value={listingForm.description}
                onChange={(event) =>
                  setListingForm((prev) => ({ ...prev, description: event.target.value }))
                }
              />
            </div>
            <div className="flex gap-3">
              <Button onClick={() => void handleSaveListing()} disabled={saving}>
                {saving
                  ? pickLocalizedCopy(appLanguage, { ar: 'جارٍ الحفظ...', en: 'Saving...' })
                  : listingForm.id
                    ? pickLocalizedCopy(appLanguage, { ar: 'تحديث الإعلان', en: 'Update listing' })
                    : pickLocalizedCopy(appLanguage, { ar: 'إضافة الإعلان', en: 'Add listing' })}
              </Button>
              <Button variant="outline" onClick={() => setIsListingDialogOpen(false)}>
                {pickLocalizedCopy(appLanguage, { ar: 'إغلاق', en: 'Close' })}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>{pickLocalizedCopy(appLanguage, { ar: 'صندوق وارد الاستفسارات', en: 'Inquiry inbox' })}</CardTitle>
            <CardDescription>
              {pickLocalizedCopy(appLanguage, {
                ar: 'آخر الرسائل التي وصلت على إعلاناتك مع الوصول السريع لصفحة المتابعة.',
                en: 'Recent messages on your listings with quick access to the follow-up page.',
              })}
            </CardDescription>
          </div>
          <Button asChild variant="outline">
            <Link to="/marketplace/inquiries?tab=received">
              {pickLocalizedCopy(appLanguage, { ar: 'إدارة كل الاستفسارات', en: 'Manage all inquiries' })}
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loadingInquiries ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-28 w-full rounded-2xl" />
              ))}
            </div>
          ) : inquiriesError ? (
            <p className="text-sm text-destructive">
              {pickLocalizedCopy(appLanguage, {
                ar: 'تعذر تحميل الاستفسارات الواردة حاليًا.',
                en: 'Unable to load incoming inquiries right now.',
              })}
            </p>
          ) : inquiries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {pickLocalizedCopy(appLanguage, {
                ar: 'لا توجد استفسارات واردة على إعلاناتك حتى الآن.',
                en: 'No incoming inquiries on your listings yet.',
              })}
            </p>
          ) : (
            <div className="space-y-4">
              {inquiries.map((inquiry) => (
                <div
                  key={inquiry.id}
                  className="rounded-2xl border border-border/60 p-4 transition-colors hover:bg-muted/20"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-muted px-3 py-1 text-xs">
                          {pickLocalizedCopy(appLanguage, inquiryStatusLabels[inquiry.status])}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(inquiry.createdAt).toLocaleDateString(
                            appLanguage === 'en' ? 'en-US' : 'ar-EG',
                          )}
                        </span>
                      </div>
                      <p className="font-semibold text-foreground">{inquiry.listingTitle}</p>
                      <p className="text-sm text-muted-foreground">
                        {pickLocalizedCopy(appLanguage, { ar: 'من:', en: 'From:' })} {inquiry.contactName}
                        {inquiry.contactEmail ? ` • ${inquiry.contactEmail}` : ''}
                      </p>
                    </div>

                    <Button asChild size="sm" variant="outline">
                      <Link to={`/marketplace/inquiries?tab=received&focus=${inquiry.id}`}>
                        {pickLocalizedCopy(appLanguage, { ar: 'فتح المحادثة', en: 'Open thread' })}
                      </Link>
                    </Button>
                  </div>

                  <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">
                    {inquiry.message}
                  </p>

                  {inquiry.replyMessage && (
                    <div className="mt-3 rounded-xl bg-primary/5 p-3 text-sm text-muted-foreground">
                      <p className="mb-1 font-medium text-foreground">
                        {pickLocalizedCopy(appLanguage, { ar: 'آخر رد محفوظ', en: 'Latest saved reply' })}
                      </p>
                      <p className="whitespace-pre-line">{inquiry.replyMessage}</p>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {inquiry.contactEmail && (
                      <Button asChild size="sm" variant="outline">
                        <a href={`mailto:${inquiry.contactEmail}`}>
                          {pickLocalizedCopy(appLanguage, { ar: 'مراسلة بالبريد', en: 'Email' })}
                        </a>
                      </Button>
                    )}
                    {inquiry.contactPhone && (
                      <Button asChild size="sm" variant="secondary">
                        <a href={`tel:${inquiry.contactPhone}`}>
                          {pickLocalizedCopy(appLanguage, { ar: 'اتصال مباشر', en: 'Call' })}
                        </a>
                      </Button>
                    )}
                    <Button asChild size="sm" variant="ghost">
                      <Link to={`/marketplace/ads/${inquiry.listingId}`}>
                        {pickLocalizedCopy(appLanguage, { ar: 'عرض الإعلان', en: 'View listing' })}
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{pickLocalizedCopy(appLanguage, { ar: 'إعلاناتي الحالية', en: 'Current listings' })}</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingListings ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : listings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {pickLocalizedCopy(appLanguage, { ar: 'لا توجد إعلانات حاليًا.', en: 'No listings right now.' })}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{pickLocalizedCopy(appLanguage, { ar: 'الإعلان', en: 'Listing' })}</TableHead>
                  <TableHead>{pickLocalizedCopy(appLanguage, { ar: 'المنطقة', en: 'District' })}</TableHead>
                  <TableHead>{pickLocalizedCopy(appLanguage, { ar: 'السعر', en: 'Price' })}</TableHead>
                  <TableHead>{pickLocalizedCopy(appLanguage, { ar: 'الحالة', en: 'Status' })}</TableHead>
                  <TableHead>{pickLocalizedCopy(appLanguage, { ar: 'الإجراءات', en: 'Actions' })}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listings.map((listing) => (
                  <TableRow key={listing.id}>
                    <TableCell className="font-medium">
                      {pickLocalizedField(appLanguage, { ar: listing.titleAr, en: listing.titleEn })}
                    </TableCell>
                    <TableCell>{districtLabel(listing.district ?? '', appLanguage) || '-'}</TableCell>
                    <TableCell>{formatAmountWithCurrency(listing.price, appLanguage)}</TableCell>
                    <TableCell>{listingStatusLabel(listing.status, appLanguage)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditListingDialog(listing)}
                        >
                          {pickLocalizedCopy(appLanguage, { ar: 'تعديل', en: 'Edit' })}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => void handleDeleteListing(listing.id)}
                        >
                          {pickLocalizedCopy(appLanguage, { ar: 'حذف', en: 'Delete' })}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
