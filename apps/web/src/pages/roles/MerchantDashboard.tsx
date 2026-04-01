import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Building2, CheckCircle, Clock, Package2, Store } from 'lucide-react';
import { toast } from 'sonner';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { StatCard } from '@/components/dashboard/StatCard';
import { useMyBusinesses } from '@/hooks/use-my-businesses';
import { useMyListings } from '@/hooks/use-my-listings';
import { listingsAPI } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { DISTRICTS, formatPrice } from '@/lib/format';
import { parseEgpInputToPiasters } from '@/lib/wallet-store';

const verificationLabels: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'outline' }
> = {
  verified: { label: 'موثق', variant: 'default' },
  pending: { label: 'قيد المراجعة', variant: 'secondary' },
  rejected: { label: 'مرفوض', variant: 'outline' },
  suspended: { label: 'موقوف', variant: 'outline' },
};

const listingCategories = [
  { value: 'shopping', label: 'تسوق' },
  { value: 'service', label: 'خدمات' },
  { value: 'healthcare', label: 'رعاية صحية' },
  { value: 'education', label: 'تعليم' },
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

export default function MerchantDashboard() {
  const queryClient = useQueryClient();
  const {
    data: businessesData,
    isLoading: loadingBusinesses,
    error: businessesError,
  } = useMyBusinesses();
  const { data: listingsData, isLoading: loadingListings } = useMyListings();
  const [listingForm, setListingForm] = useState<ListingFormState>(emptyListingForm);
  const [saving, setSaving] = useState(false);
  const isSavingRef = useRef(false);

  const businesses = businessesData ?? [];
  const listings = listingsData ?? [];

  const stats = {
    totalBusinesses: businesses.length,
    verifiedBusinesses: businesses.filter((business) => business.verificationStatus === 'verified')
      .length,
    pendingBusinesses: businesses.filter((business) => business.verificationStatus === 'pending')
      .length,
    listings: listings.length,
  };

  const refreshMerchantData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['market', 'businesses', 'mine'] }),
      queryClient.invalidateQueries({ queryKey: ['market', 'listings', 'mine'] }),
      queryClient.invalidateQueries({ queryKey: ['market', 'listings'] }),
    ]);
  };

  const handleSaveListing = async () => {
    if (isSavingRef.current) return;

    const price = parseEgpInputToPiasters(listingForm.priceEgp);
    if (!listingForm.titleAr.trim()) {
      toast.error('اسم المنتج أو الخدمة مطلوب');
      return;
    }
    if (price == null) {
      toast.error('أدخل سعراً صحيحاً');
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
      await refreshMerchantData();
      toast.success(listingForm.id ? 'تم تحديث الإعلان' : 'تمت إضافة الإعلان');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر حفظ الإعلان';
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
      toast.success('تم حذف الإعلان');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر حذف الإعلان';
      toast.error(message);
    }
  };

  return (
    <DashboardShell
      icon={Store}
      title="لوحة التاجر"
      subtitle="إدارة نشاطك التجاري وإعلانات المنتجات والخدمات"
    >
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="الأنشطة التجارية"
          value={loadingBusinesses ? '...' : stats.totalBusinesses}
          icon={Building2}
        />
        <StatCard
          label="أنشطة موثقة"
          value={loadingBusinesses ? '...' : stats.verifiedBusinesses}
          icon={CheckCircle}
          variant="success"
        />
        <StatCard
          label="أنشطة قيد المراجعة"
          value={loadingBusinesses ? '...' : stats.pendingBusinesses}
          icon={Clock}
          variant="warning"
        />
        <StatCard
          label="إعلاناتي"
          value={loadingListings ? '...' : stats.listings}
          icon={Package2}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>أنشطتي التجارية</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingBusinesses ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 w-full" />
                ))}
              </div>
            ) : businessesError ? (
              <p className="text-sm text-destructive">حدث خطأ في تحميل الأنشطة التجارية</p>
            ) : businesses.length === 0 ? (
              <p className="text-sm text-muted-foreground">لم تسجل أي نشاط تجاري بعد.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>النشاط</TableHead>
                    <TableHead>التصنيف</TableHead>
                    <TableHead>المنطقة</TableHead>
                    <TableHead>الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {businesses.map((business) => {
                    const status =
                      verificationLabels[business.verificationStatus] ?? verificationLabels.pending;
                    return (
                      <TableRow key={business.id}>
                        <TableCell className="font-medium">{business.nameAr}</TableCell>
                        <TableCell>{business.category}</TableCell>
                        <TableCell>{business.district ?? '-'}</TableCell>
                        <TableCell>
                          <span className="rounded-full bg-muted px-3 py-1 text-xs">
                            {status.label}
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
            <CardTitle>{listingForm.id ? 'تعديل إعلان' : 'إضافة إعلان جديد'}</CardTitle>
            <CardDescription>أضف منتجاً أو خدمة مع السعر وقم بتحديثها لاحقاً</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="listingTitle">الاسم</Label>
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
                <Label htmlFor="listingPrice">السعر (جنيه)</Label>
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
                <Label>التصنيف</Label>
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
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>المنطقة</Label>
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
                        {district.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="listingAddress">العنوان</Label>
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
              <Label htmlFor="listingDescription">الوصف</Label>
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
                {saving ? 'جارٍ الحفظ...' : listingForm.id ? 'تحديث الإعلان' : 'إضافة الإعلان'}
              </Button>
              {listingForm.id && (
                <Button variant="outline" onClick={() => setListingForm(emptyListingForm)}>
                  إلغاء
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>إعلاناتي الحالية</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingListings ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : listings.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد إعلانات حالياً.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الإعلان</TableHead>
                  <TableHead>المنطقة</TableHead>
                  <TableHead>السعر</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listings.map((listing) => (
                  <TableRow key={listing.id}>
                    <TableCell className="font-medium">{listing.titleAr}</TableCell>
                    <TableCell>{listing.district ?? '-'}</TableCell>
                    <TableCell>{formatPrice(listing.price)} ج.م</TableCell>
                    <TableCell>{listing.status}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setListingForm({
                              id: listing.id,
                              titleAr: listing.titleAr,
                              description: listing.description ?? '',
                              priceEgp: String(listing.price / 100),
                              district: listing.district ?? emptyListingForm.district,
                              category: listing.category,
                              address: listing.address ?? '',
                            })
                          }
                        >
                          تعديل
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => void handleDeleteListing(listing.id)}
                        >
                          حذف
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
