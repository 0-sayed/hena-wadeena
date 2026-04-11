import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { BookOpen, CalendarCheck, ChevronDown, Coins, MapPinned } from 'lucide-react';
import { GuideLanguage, GuideSpecialty, NvDistrict } from '@hena-wadeena/types';
import { toast } from 'sonner';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { StatCard } from '@/components/dashboard/StatCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyGuideProfile } from '@/hooks/use-my-guide-profile';
import { useMyPackages } from '@/hooks/use-my-packages';
import { useMyBookings } from '@/hooks/use-my-bookings';
import { useAuth } from '@/hooks/use-auth';
import { myGuideAPI, myPackagesAPI, bookingsAPI } from '@/services/api';
import { districtLabel, formatPrice, languageLabel, specialtyLabel } from '@/lib/format';
import { getBookingStatusLabels } from '@/lib/booking-status';
import { pickLocalizedCopy, pickLocalizedField, type AppLanguage } from '@/lib/localization';
import { parseEgpInputToPiasters } from '@/lib/wallet-store';
import { useTranslation } from 'react-i18next';

type MultiSelectOption = {
  value: string;
  label: string;
};

type GuideFormState = {
  licenseNumber: string;
  basePriceEgp: string;
  bioAr: string;
  languages: string[];
  specialties: string[];
  areasOfOperation: string[];
};

type PackageFormState = {
  id?: string;
  titleAr: string;
  description: string;
  durationHours: string;
  maxPeople: string;
  priceEgp: string;
  includes: string;
};

const emptyPackageForm: PackageFormState = {
  titleAr: '',
  description: '',
  durationHours: '',
  maxPeople: '',
  priceEgp: '',
  includes: '',
};

function MultiSelectField({
  label,
  placeholder,
  options,
  values,
  onChange,
}: {
  label: string;
  placeholder: string;
  options: MultiSelectOption[];
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const selectedLabels = options.filter((option) => values.includes(option.value)).map((option) => option.label);

  const toggleValue = (value: string, checked: boolean) => {
    if (checked) {
      onChange([...values, value]);
      return;
    }

    onChange(values.filter((item) => item !== value));
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="w-full justify-between">
            <span className="truncate">
              {selectedLabels.length > 0 ? selectedLabels.join('، ') : placeholder}
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] space-y-3 p-3">
          {options.map((option) => (
            <label key={option.value} className="flex items-center gap-3 text-sm">
              <Checkbox
                checked={values.includes(option.value)}
                onCheckedChange={(checked) => toggleValue(option.value, checked === true)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </PopoverContent>
      </Popover>
      {selectedLabels.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedLabels.map((selectedLabel) => (
            <Badge key={selectedLabel} variant="secondary">
              {selectedLabel}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function splitCommaValues(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatAmountWithCurrency(value: number, language: AppLanguage): string {
  return `${formatPrice(value)} ${t('transactions.currency')}`;
}

export default function GuideDashboard() {
  const {
    t
  } = useTranslation(['wallet', 'guides', 'profile', 'marketplace', 'market', 'tourism', 'logistics', 'investment']);

  const queryClient = useQueryClient();
  const { language } = useAuth();
  const appLanguage: AppLanguage = language === 'en' ? 'en' : 'ar';
  const bookingStatusLabels = getBookingStatusLabels(appLanguage);
  const guideProfileQuery = useMyGuideProfile();
  const packagesQuery = useMyPackages();
  const bookingsQuery = useMyBookings();

  const [guideForm, setGuideForm] = useState<GuideFormState>({
    licenseNumber: '',
    basePriceEgp: '',
    bioAr: '',
    languages: [],
    specialties: [],
    areasOfOperation: [],
  });
  const [packageForm, setPackageForm] = useState<PackageFormState>(emptyPackageForm);
  const [savingGuide, setSavingGuide] = useState(false);
  const [savingPackage, setSavingPackage] = useState(false);
  const [processingBookingId, setProcessingBookingId] = useState<string | null>(null);

  const guideProfile = guideProfileQuery.data;
  const myPackages = useMemo(() => packagesQuery.data?.data ?? [], [packagesQuery.data?.data]);
  const myBookings = useMemo(() => bookingsQuery.data?.data ?? [], [bookingsQuery.data?.data]);
  const languageOptions = useMemo(
    () =>
      Object.values(GuideLanguage).map((value) => ({
        value,
        label: languageLabel(value, appLanguage),
      })),
    [appLanguage],
  );
  const specialtyOptions = useMemo(
    () =>
      Object.values(GuideSpecialty).map((value) => ({
        value,
        label: specialtyLabel(value, appLanguage),
      })),
    [appLanguage],
  );
  const areaOptions = useMemo(
    () =>
      Object.values(NvDistrict).map((value) => ({
        value,
        label: districtLabel(value, appLanguage),
      })),
    [appLanguage],
  );

  useEffect(() => {
    if (!guideProfile) return;
    setGuideForm({
      licenseNumber: guideProfile.licenseNumber,
      basePriceEgp: String(guideProfile.basePrice / 100),
      bioAr: guideProfile.bioAr ?? '',
      languages: guideProfile.languages,
      specialties: guideProfile.specialties,
      areasOfOperation: guideProfile.areasOfOperation,
    });
  }, [guideProfile]);

  const stats = useMemo(() => {
    const completedBookings = myBookings.filter((booking) => booking.status === 'completed');
    return {
      packages: myPackages.length,
      pendingBookings: myBookings.filter((booking) => booking.status === 'pending').length,
      activeBookings: myBookings.filter((booking) =>
        ['confirmed', 'in_progress'].includes(booking.status),
      ).length,
      earnings: completedBookings.reduce((sum, booking) => sum + booking.totalPrice, 0),
    };
  }, [myBookings, myPackages]);

  const refreshGuideData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['guides', 'mine', 'profile'] }),
      queryClient.invalidateQueries({ queryKey: ['guides', 'mine', 'packages'] }),
      queryClient.invalidateQueries({ queryKey: ['bookings', 'mine'] }),
    ]);
  };

  const handleSaveGuide = async () => {
    const basePrice = parseEgpInputToPiasters(guideForm.basePriceEgp);
    if (!guideForm.licenseNumber.trim()) {
      toast.error(
        t('dashboard.toasts.licenseRequired'),
      );
      return;
    }
    if (basePrice == null) {
      toast.error(
        t('dashboard.toasts.invalidDailyRate'),
      );
      return;
    }

    setSavingGuide(true);
    try {
      const payload = {
        licenseNumber: guideForm.licenseNumber.trim(),
        basePrice,
        bioAr: guideForm.bioAr.trim() || undefined,
        languages: guideForm.languages,
        specialties: guideForm.specialties,
        areasOfOperation: guideForm.areasOfOperation,
      };

      if (guideProfile) {
        await myGuideAPI.update(payload);
      } else {
        await myGuideAPI.create(payload);
      }

      await refreshGuideData();
      toast.success(
        guideProfile
          ? t('dashboard.toasts.profileUpdated')
          : t('dashboard.toasts.profileCreated'),
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t('dashboard.toasts.profileSaveError');
      toast.error(message);
    } finally {
      setSavingGuide(false);
    }
  };

  const handleSavePackage = async () => {
    const price = parseEgpInputToPiasters(packageForm.priceEgp);
    const durationHours = Number(packageForm.durationHours);
    const maxPeople = Number(packageForm.maxPeople);

    if (!packageForm.titleAr.trim()) {
      toast.error(
        t('dashboard.toasts.packageTitleRequired'),
      );
      return;
    }
    if (!Number.isFinite(durationHours) || durationHours <= 0) {
      toast.error(
        t('dashboard.toasts.invalidDuration'),
      );
      return;
    }
    if (!Number.isFinite(maxPeople) || maxPeople <= 0) {
      toast.error(
        t('dashboard.toasts.invalidMaxPeople'),
      );
      return;
    }
    if (price == null) {
      toast.error(
        t('dashboard.toasts.invalidPrice'),
      );
      return;
    }

    setSavingPackage(true);
    try {
      const payload = {
        titleAr: packageForm.titleAr.trim(),
        description: packageForm.description.trim() || undefined,
        durationHours,
        maxPeople,
        price,
        includes: splitCommaValues(packageForm.includes),
      };

      if (packageForm.id) {
        await myPackagesAPI.update(packageForm.id, payload);
      } else {
        await myPackagesAPI.create(payload);
      }

      setPackageForm(emptyPackageForm);
      await refreshGuideData();
      toast.success(
        packageForm.id
          ? t('dashboard.toasts.packageUpdated')
          : t('dashboard.toasts.packageAdded'),
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t('dashboard.toasts.packageSaveError');
      toast.error(message);
    } finally {
      setSavingPackage(false);
    }
  };

  const handleDeletePackage = async (id: string) => {
    try {
      await myPackagesAPI.remove(id);
      await refreshGuideData();
      if (packageForm.id === id) {
        setPackageForm(emptyPackageForm);
      }
      toast.success(
        t('dashboard.toasts.packageDeleted'),
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t('dashboard.toasts.packageDeleteError');
      toast.error(message);
    }
  };

  const handleBookingAction = async (
    bookingId: string,
    action: 'confirm' | 'start' | 'complete' | 'cancel',
  ) => {
    setProcessingBookingId(bookingId);
    try {
      if (action === 'confirm') await bookingsAPI.confirmBooking(bookingId);
      if (action === 'start') await bookingsAPI.startBooking(bookingId);
      if (action === 'complete') await bookingsAPI.completeBooking(bookingId);
      if (action === 'cancel') {
        await bookingsAPI.cancelBooking(
          bookingId,
          t('dashboard.toasts.cancelledByGuide'),
        );
      }
      await refreshGuideData();
      toast.success(
        t('dashboard.toasts.bookingUpdated'),
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t('dashboard.toasts.bookingUpdateError');
      toast.error(message);
    } finally {
      setProcessingBookingId(null);
    }
  };

  const isLoading =
    guideProfileQuery.isLoading || packagesQuery.isLoading || bookingsQuery.isLoading;

  return (
    <DashboardShell
      icon={MapPinned}
      title={t('dashboard.title')}
      subtitle={t('dashboard.subtitle')}
    >
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label={t('dashboard.stats.packages')}
          value={isLoading ? '...' : stats.packages}
          icon={BookOpen}
        />
        <StatCard
          label={t('dashboard.stats.newRequests')}
          value={isLoading ? '...' : stats.pendingBookings}
          icon={CalendarCheck}
          variant="warning"
        />
        <StatCard
          label={t('dashboard.stats.activeBookings')}
          value={isLoading ? '...' : stats.activeBookings}
          icon={MapPinned}
          variant="success"
        />
        <StatCard
          label={t('dashboard.stats.totalEarnings')}
          value={isLoading ? '...' : formatAmountWithCurrency(stats.earnings, appLanguage)}
          icon={Coins}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              {guideProfile
                ? t('dashboard.profile.titleEdit')
                : t('dashboard.profile.titleCreate')}
            </CardTitle>
            <CardDescription>
              {t('dashboard.profile.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {guideProfileQuery.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="licenseNumber">
                    {t('dashboard.profile.licenseNumber')}
                  </Label>
                  <Input
                    id="licenseNumber"
                    value={guideForm.licenseNumber}
                    onChange={(event) =>
                      setGuideForm((prev) => ({
                        ...prev,
                        licenseNumber: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="basePrice">
                    {t('dashboard.profile.dailyRate')}
                  </Label>
                  <Input
                    id="basePrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={guideForm.basePriceEgp}
                    onChange={(event) =>
                      setGuideForm((prev) => ({
                        ...prev,
                        basePriceEgp: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bioAr">
                    {t('dashboard.profile.bio')}
                  </Label>
                  <Textarea
                    id="bioAr"
                    rows={4}
                    value={guideForm.bioAr}
                    onChange={(event) =>
                      setGuideForm((prev) => ({
                        ...prev,
                        bioAr: event.target.value,
                      }))
                    }
                  />
                </div>
                <MultiSelectField
                  label={t('dashboard.profile.languages')}
                  placeholder={t('dashboard.profile.languagesPlaceholder')}
                  options={languageOptions}
                  values={guideForm.languages}
                  onChange={(languages) =>
                    setGuideForm((prev) => ({
                      ...prev,
                      languages,
                    }))
                  }
                />
                <MultiSelectField
                  label={t('dashboard.profile.specialties')}
                  placeholder={t('dashboard.profile.specialtiesPlaceholder')}
                  options={specialtyOptions}
                  values={guideForm.specialties}
                  onChange={(specialties) =>
                    setGuideForm((prev) => ({
                      ...prev,
                      specialties,
                    }))
                  }
                />
                <MultiSelectField
                  label={t('dashboard.profile.areas')}
                  placeholder={t('dashboard.profile.areasPlaceholder')}
                  options={areaOptions}
                  values={guideForm.areasOfOperation}
                  onChange={(areasOfOperation) =>
                    setGuideForm((prev) => ({
                      ...prev,
                      areasOfOperation,
                    }))
                  }
                />
                <Button onClick={() => void handleSaveGuide()} disabled={savingGuide}>
                  {savingGuide
                    ? t('form.savingBtn')
                    : guideProfile
                      ? t('dashboard.profile.updateBtn')
                      : t('dashboard.profile.createBtn')}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {packageForm.id
                ? t('dashboard.package.titleEdit')
                : t('dashboard.package.titleAdd')}
            </CardTitle>
            <CardDescription>
              {t('dashboard.package.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="packageTitle">
                {t('dashboard.package.formTitle')}
              </Label>
              <Input
                id="packageTitle"
                value={packageForm.titleAr}
                onChange={(event) =>
                  setPackageForm((prev) => ({
                    ...prev,
                    titleAr: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="packageDescription">
                {t('listingDetails.descriptionTitle')}
              </Label>
              <Textarea
                id="packageDescription"
                rows={3}
                value={packageForm.description}
                onChange={(event) =>
                  setPackageForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="durationHours">
                  {t('dashboard.package.formDuration')}
                </Label>
                <Input
                  id="durationHours"
                  type="number"
                  min="1"
                  value={packageForm.durationHours}
                  onChange={(event) =>
                    setPackageForm((prev) => ({
                      ...prev,
                      durationHours: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxPeople">
                  {t('dashboard.package.formMaxPeople')}
                </Label>
                <Input
                  id="maxPeople"
                  type="number"
                  min="1"
                  value={packageForm.maxPeople}
                  onChange={(event) =>
                    setPackageForm((prev) => ({
                      ...prev,
                      maxPeople: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priceEgp">
                  {t('listingEditor.priceLabel')}
                </Label>
                <Input
                  id="priceEgp"
                  type="number"
                  min="0"
                  step="0.01"
                  value={packageForm.priceEgp}
                  onChange={(event) =>
                    setPackageForm((prev) => ({
                      ...prev,
                      priceEgp: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="includes">
                {t('dashboard.package.formIncludes')}
              </Label>
              <Input
                id="includes"
                placeholder={t('dashboard.package.formIncludesPlaceholder')}
                value={packageForm.includes}
                onChange={(event) =>
                  setPackageForm((prev) => ({
                    ...prev,
                    includes: event.target.value,
                  }))
                }
              />
            </div>
            <div className="flex gap-3">
              <Button onClick={() => void handleSavePackage()} disabled={savingPackage}>
                {savingPackage
                  ? t('form.savingBtn')
                  : packageForm.id
                    ? t('dashboard.package.saveBtnUpdate')
                    : t('dashboard.package.saveBtnAdd')}
              </Button>
              {packageForm.id && (
                <Button variant="outline" onClick={() => setPackageForm(emptyPackageForm)}>
                  {t('dashboard.package.cancelBtn')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {t('dashboard.packagesList.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {packagesQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : myPackages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('dashboard.packagesList.empty')}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('booking.packageLabel')}</TableHead>
                  <TableHead>{t('attractions.durationTitle')}</TableHead>
                  <TableHead>{t('dashboard.packagesList.colCapacity')}</TableHead>
                  <TableHead>{t('prices.table.price')}</TableHead>
                  <TableHead>{t('dashboard.packagesList.colActions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myPackages.map((pkg) => (
                  <TableRow key={pkg.id}>
                    <TableCell className="font-medium">
                      {pickLocalizedField(appLanguage, { ar: pkg.titleAr, en: pkg.titleEn })}
                    </TableCell>
                    <TableCell>
                      {pkg.durationHours}{' '}
                      {t('home.hourLabel')}
                    </TableCell>
                    <TableCell>{pkg.maxPeople}</TableCell>
                    <TableCell>{formatAmountWithCurrency(pkg.price, appLanguage)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setPackageForm({
                              id: pkg.id,
                              titleAr: pkg.titleAr,
                              description: pkg.description ?? '',
                              durationHours: String(pkg.durationHours),
                              maxPeople: String(pkg.maxPeople),
                              priceEgp: String(pkg.price / 100),
                              includes: pkg.includes?.join(', ') ?? '',
                            })
                          }
                        >
                          {t('booking.editBtn')}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => void handleDeletePackage(pkg.id)}
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

      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.bookings.title')}</CardTitle>
          <CardDescription>
            {t('dashboard.bookings.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bookingsQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : myBookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('dashboard.bookings.empty')}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('booking.packageLabel')}</TableHead>
                  <TableHead>{t('booking.dateLabel')}</TableHead>
                  <TableHead>{t('dashboard.bookings.colGuests')}</TableHead>
                  <TableHead>{t('startupDetails.status')}</TableHead>
                  <TableHead>{t('dashboard.packagesList.colActions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">
                      {pickLocalizedField(appLanguage, {
                        ar: booking.packageTitleAr,
                        en: booking.packageTitleEn,
                      }) || booking.packageId}
                    </TableCell>
                    <TableCell>{booking.bookingDate}</TableCell>
                    <TableCell>{booking.peopleCount}</TableCell>
                    <TableCell>{bookingStatusLabels[booking.status]?.label ?? booking.status}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {booking.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => void handleBookingAction(booking.id, 'confirm')}
                            disabled={processingBookingId === booking.id}
                          >
                            {t('bookings.confirmBtn')}
                          </Button>
                        )}
                        {booking.status === 'confirmed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void handleBookingAction(booking.id, 'start')}
                            disabled={processingBookingId === booking.id}
                          >
                            {t('bookings.dialogs.start.title')}
                          </Button>
                        )}
                        {booking.status === 'in_progress' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void handleBookingAction(booking.id, 'complete')}
                            disabled={processingBookingId === booking.id}
                          >
                            {t('bookings.dialogs.complete.title')}
                          </Button>
                        )}
                        {!['completed', 'cancelled'].includes(booking.status) && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => void handleBookingAction(booking.id, 'cancel')}
                            disabled={processingBookingId === booking.id}
                          >
                            {t('topup.cancelBtn')}
                          </Button>
                        )}
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
