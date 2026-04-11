import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Megaphone, PlusCircle } from 'lucide-react';
import { toast } from 'sonner';

import {
  ListingEditorDialog,
} from '@/components/market/ListingEditorDialog';
import { emptyListingForm, type ListingFormState } from '@/components/market/listing-editor-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAdminListings } from '@/hooks/use-admin';
import { useAuth } from '@/hooks/use-auth';
import { districtLabel, formatPrice } from '@/lib/format';
import { useTranslation } from 'react-i18next';
import { queryKeys } from '@/lib/query-keys';
import { parseEgpInputToPiasters } from '@/lib/wallet-store';
import { listingsAPI, type Listing } from '@/services/api';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { TFunction } from 'i18next';

const PAGE_SIZE = 20;

function formatAmountWithCurrency(value: number, t: TFunction): string {
  return `${formatPrice(value)} ${t('listings.currency')}`;
}

function listingStatusLabel(status: string, t: TFunction) {
  return t(`listings.status.${status}`, { defaultValue: status });
}

function toListingFormState(listing: Listing): ListingFormState {
  return {
    id: listing.id,
    titleAr: listing.titleAr,
    description: listing.description ?? '',
    priceEgp: String(listing.price / 100),
    district: listing.district ?? emptyListingForm.district,
    category: listing.category,
    address: listing.address ?? '',
  };
}

export default function AdminListings() {
  const queryClient = useQueryClient();
  const { language } = useAuth();
  const { t } = useTranslation('admin');
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [listingForm, setListingForm] = useState<ListingFormState>(emptyListingForm);
  const [isListingDialogOpen, setIsListingDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const isSavingRef = useRef(false);
  const appLanguage = language === 'en' ? 'en' : 'ar';
  const isRtl = appLanguage === 'ar';
  const dialogMode = searchParams.get('dialog');

  const listingsQuery = useAdminListings({
    page,
    limit: PAGE_SIZE,
    sort: 'created_at|desc',
  });

  const listings = listingsQuery.data?.data ?? [];
  const total = listingsQuery.data?.total ?? 0;
  const hasMore = listingsQuery.data?.hasMore ?? false;
  const totalPages = total > 0 ? Math.ceil(total / PAGE_SIZE) : 1;

  useEffect(() => {
    if (dialogMode === 'new') {
      setListingForm(emptyListingForm);
      setIsListingDialogOpen(true);
    }
  }, [dialogMode]);

  const handleDialogOpenChange = (open: boolean) => {
    setIsListingDialogOpen(open);
    if (!open && dialogMode) {
      const nextSearchParams = new URLSearchParams(searchParams);
      nextSearchParams.delete('dialog');
      setSearchParams(nextSearchParams, { replace: true });
    }
  };

  const refreshAdminListings = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.listingsAll() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats() }),
      queryClient.invalidateQueries({ queryKey: ['market', 'listings'] }),
    ]);
  };

  const openCreateListingDialog = () => {
    setListingForm(emptyListingForm);
    setIsListingDialogOpen(true);
  };

  const openEditListingDialog = (listing: Listing) => {
    setListingForm(toListingFormState(listing));
    setIsListingDialogOpen(true);
  };

  const handleSaveListing = async () => {
    if (isSavingRef.current) return;

    const price = parseEgpInputToPiasters(listingForm.priceEgp);
    if (!listingForm.titleAr.trim()) {
      toast.error(t('listings.saveReq'));
      return;
    }
    if (price == null) {
      toast.error(t('listings.priceReq'));
      return;
    }

    isSavingRef.current = true;
    setSaving(true);
    try {
      const payload = {
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
        await listingsAPI.create({
          ...payload,
          listingType: 'business',
          transaction: 'sale',
        });
      }

      setListingForm(emptyListingForm);
      handleDialogOpenChange(false);
      await refreshAdminListings();
      toast.success(
        listingForm.id ? t('listings.listingUpdated') : t('listings.listingAdded')
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('listings.saveErr'));
    } finally {
      isSavingRef.current = false;
      setSaving(false);
    }
  };

  const handleDeleteListing = async (id: string) => {
    try {
      await listingsAPI.remove(id);
      if (listingForm.id === id) {
        setListingForm(emptyListingForm);
      }
      await refreshAdminListings();
      toast.success(t('listings.listingDeleted'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('listings.deleteErr'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="flex items-center gap-3 text-2xl font-bold">
            <Megaphone className="h-6 w-6 text-primary" />
            {t('listings.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('listings.subtitle')}
          </p>
        </div>

        <Button onClick={openCreateListingDialog}>
          <PlusCircle className="h-4 w-4" />
          {t('listings.newBtn')}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{t('listings.allListings')}</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{total}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('listings.currentPage')}</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{page}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('listings.totalPages')}</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{totalPages}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>{t('listings.tableTitle')}</CardTitle>
            <CardDescription>
              {t('listings.tableDesc')}
            </CardDescription>
          </div>
          <Button asChild variant="outline">
            <Link to="/marketplace">
              {t('listings.openMarketplace')}
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {listingsQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : listingsQuery.error ? (
            <p className="text-sm text-destructive">
              {t('listings.loadError')}
            </p>
          ) : listings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('listings.noListings')}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('listings.table.listing')}</TableHead>
                  <TableHead>{t('listings.table.owner')}</TableHead>
                  <TableHead>{t('listings.table.district')}</TableHead>
                  <TableHead>{t('listings.table.price')}</TableHead>
                  <TableHead>{t('listings.table.status')}</TableHead>
                  <TableHead>{t('listings.table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listings.map((listing) => (
                  <TableRow key={listing.id}>
                    <TableCell className="font-medium">
                      <div className="space-y-1">
                        <div>{(appLanguage === 'en' ? listing.titleEn : listing.titleAr) ?? listing.titleAr ?? ''}</div>
                        <p className="text-xs text-muted-foreground">{listing.slug}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{listing.ownerId}</TableCell>
                    <TableCell>{districtLabel(listing.district ?? '', appLanguage) || '-'}</TableCell>
                    <TableCell>{formatAmountWithCurrency(listing.price, t)}</TableCell>
                    <TableCell>{listingStatusLabel(listing.status, t)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditListingDialog(listing)}
                        >
                          {t('listings.edit')}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            void handleDeleteListing(listing.id);
                          }}
                        >
                          {t('listings.delete')}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-4">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
                {isRtl ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
              <span className="text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={!hasMore} onClick={() => setPage((value) => value + 1)}>
                {isRtl ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ListingEditorDialog
        appLanguage={appLanguage}
        form={listingForm}
        open={isListingDialogOpen}
        saving={saving}
        onFormChange={setListingForm}
        onOpenChange={handleDialogOpenChange}
        onSave={() => {
          void handleSaveListing();
        }}
      />
    </div>
  );
}
