import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Briefcase, Building2, CheckCircle, Clock, Inbox, Package2, Store } from 'lucide-react';
import { toast } from 'sonner';

import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { StatCard } from '@/components/dashboard/StatCard';
import {
  ListingEditorDialog,
} from '@/components/market/ListingEditorDialog';
import { emptyListingForm, type ListingFormState } from '@/components/market/listing-editor-form';
import { useListingInquiriesReceived } from '@/hooks/use-listing-inquiries';
import { useMyBusinesses } from '@/hooks/use-my-businesses';
import { useMyListings } from '@/hooks/use-my-listings';
import { useAuth } from '@/hooks/use-auth';
import { useMyPosts } from '@/hooks/use-jobs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { districtLabel, formatPrice } from '@/lib/format';
import { pickLocalizedCopy, pickLocalizedField, type AppLanguage } from '@/lib/localization';
import { parseEgpInputToPiasters } from '@/lib/wallet-store';
import { listingsAPI } from '@/services/api';
import { useTranslation } from 'react-i18next';

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

function formatAmountWithCurrency(value: number, language: AppLanguage): string {
  return `${formatPrice(value)} ${t('transactions.currency')}`;
}

function listingStatusLabel(status: string, language: AppLanguage) {
  const labels = listingStatusLabels[status];
  return labels ? pickLocalizedCopy(language, labels) : status;
}

export default function MerchantDashboard() {
  const {
    t
  } = useTranslation(['wallet', 'dashboard', 'marketplace', 'market', 'investment', 'profile', 'guides', 'tourism', 'logistics']);

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
  const { data: myPostsData, isLoading: loadingMyPosts } = useMyPosts(true);
  const openJobsCount = (myPostsData?.data ?? []).filter((j) => j.status === 'open').length;
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
        t('merchant.toasts.titleRequired'),
      );
      return;
    }
    if (price == null) {
      toast.error(
        t('merchant.toasts.invalidPrice'),
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
          ? t('merchant.toasts.updated')
          : t('merchant.toasts.added'),
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t('merchant.toasts.saveError');
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
        t('merchant.toasts.deleted'),
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t('merchant.toasts.deleteError');
      toast.error(message);
    }
  };

  return (
    <DashboardShell
      icon={Store}
      title={t('merchant.title')}
      subtitle={t('merchant.subtitle')}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StatCard
          label={t('merchant.stats.businesses')}
          value={loadingBusinesses ? '...' : stats.totalBusinesses}
          icon={Building2}
        />
        <StatCard
          label={t('merchant.stats.verified')}
          value={loadingBusinesses ? '...' : stats.verifiedBusinesses}
          icon={CheckCircle}
          variant="success"
        />
        <StatCard
          label={t('merchant.stats.underReview')}
          value={loadingBusinesses ? '...' : stats.pendingBusinesses}
          icon={Clock}
          variant="warning"
        />
        <StatCard
          label={t('merchant.stats.myListings')}
          value={loadingListings ? '...' : stats.listings}
          icon={Package2}
        />
        <StatCard
          label={t('merchant.stats.inquiries')}
          value={loadingInquiries ? '...' : stats.receivedInquiries}
          icon={Inbox}
          variant="warning"
        />
        <StatCard
          label={t('merchant.stats.openJobs')}
          value={loadingMyPosts ? '...' : openJobsCount}
          icon={Briefcase}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              {t('merchant.businesses.title')}
            </CardTitle>
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
                {t('merchant.businesses.loadError')}
              </p>
            ) : businesses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('merchant.businesses.empty')}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      {t('merchant.businesses.table.business')}
                    </TableHead>
                    <TableHead>
                      {t('prices.table.category')}
                    </TableHead>
                    <TableHead>
                      {t('listingEditor.districtLabel')}
                    </TableHead>
                    <TableHead>
                      {t('startupDetails.status')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {businesses.map((business) => {
                    const status =
                      verificationLabels[business.verificationStatus] ?? verificationLabels.pending;

                    return (
                      <TableRow key={business.id}>
                        <TableCell className="font-medium">
                          {pickLocalizedField(appLanguage, {
                            ar: business.nameAr,
                            en: business.nameEn,
                          })}
                        </TableCell>
                        <TableCell>{business.category}</TableCell>
                        <TableCell>
                          {districtLabel(business.district ?? '', appLanguage) || '-'}
                        </TableCell>
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
              {t('listingEditor.titleAdd')}
            </CardTitle>
            <CardDescription>
              {t('merchant.listingActions.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('merchant.listingActions.helpText')}
            </p>
            <Button onClick={openCreateListingDialog}>
              {t('merchant.listingActions.addBtn')}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {t('merchant.employment.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t('merchant.employment.description')}
            </p>
            <div className="flex gap-2">
              <Button asChild size="sm">
                <Link to="/jobs/post">
                  {t('merchant.employment.postBtn')}
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/jobs/my-posts">
                  {t('merchant.employment.myPostsBtn')}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <ListingEditorDialog
        appLanguage={appLanguage}
        form={listingForm}
        open={isListingDialogOpen}
        saving={saving}
        onFormChange={setListingForm}
        onOpenChange={setIsListingDialogOpen}
        onSave={() => {
          void handleSaveListing();
        }}
      />

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>
              {t('merchant.inbox.title')}
            </CardTitle>
            <CardDescription>
              {t('merchant.inbox.description')}
            </CardDescription>
          </div>
          <Button asChild variant="outline">
            <Link to="/marketplace/inquiries?tab=received">
              {t('merchant.inbox.manageBtn')}
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
              {t('merchant.inbox.loadError')}
            </p>
          ) : inquiries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('merchant.inbox.empty')}
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
                        {t('merchant.inbox.from')}{' '}
                        {inquiry.contactName}
                        {inquiry.contactEmail ? ` • ${inquiry.contactEmail}` : ''}
                      </p>
                    </div>

                    <Button asChild size="sm" variant="outline">
                      <Link to={`/marketplace/inquiries?tab=received&focus=${inquiry.id}`}>
                        {t('merchant.inbox.openThread')}
                      </Link>
                    </Button>
                  </div>

                  <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">
                    {inquiry.message}
                  </p>

                  {inquiry.replyMessage && (
                    <div className="mt-3 rounded-xl bg-primary/5 p-3 text-sm text-muted-foreground">
                      <p className="mb-1 font-medium text-foreground">
                        {t('merchant.inbox.latestReply')}
                      </p>
                      <p className="whitespace-pre-line">{inquiry.replyMessage}</p>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {inquiry.contactEmail && (
                      <Button asChild size="sm" variant="outline">
                        <a href={`mailto:${inquiry.contactEmail}`}>
                          {t('form.email')}
                        </a>
                      </Button>
                    )}
                    {inquiry.contactPhone && (
                      <Button asChild size="sm" variant="secondary">
                        <a href={`tel:${inquiry.contactPhone}`}>
                          {t('merchant.inbox.call')}
                        </a>
                      </Button>
                    )}
                    <Button asChild size="sm" variant="ghost">
                      <Link to={`/marketplace/ads/${inquiry.listingId}`}>
                        {t('merchant.inbox.viewListing')}
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
          <CardTitle>
            {t('merchant.listingsList.title')}
          </CardTitle>
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
              {t('merchant.listingsList.empty')}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    {t('merchant.listingsList.table.listing')}
                  </TableHead>
                  <TableHead>
                    {t('listingEditor.districtLabel')}
                  </TableHead>
                  <TableHead>
                    {t('prices.table.price')}
                  </TableHead>
                  <TableHead>
                    {t('startupDetails.status')}
                  </TableHead>
                  <TableHead>
                    {t('dashboard.packagesList.colActions')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listings.map((listing) => (
                  <TableRow key={listing.id}>
                    <TableCell className="font-medium">
                      {pickLocalizedField(appLanguage, {
                        ar: listing.titleAr,
                        en: listing.titleEn,
                      })}
                    </TableCell>
                    <TableCell>
                      {districtLabel(listing.district ?? '', appLanguage) || '-'}
                    </TableCell>
                    <TableCell>{formatAmountWithCurrency(listing.price, appLanguage)}</TableCell>
                    <TableCell>{listingStatusLabel(listing.status, appLanguage)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditListingDialog(listing)}
                        >
                          {t('booking.editBtn')}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => void handleDeleteListing(listing.id)}
                        >
                          {t('transport.delete')}
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
