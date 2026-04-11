import { useCallback, useEffect, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Wallet, ArrowUpCircle, ArrowDownCircle, CreditCard, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { Wallet as WalletType, Transaction } from '@/services/api';
import { SR } from '@/components/motion/ScrollReveal';
import { PageTransition, GradientMesh } from '@/components/motion/PageTransition';
import { Skeleton } from '@/components/motion/Skeleton';
import { useAuth } from '@/hooks/use-auth';
import { formatPrice } from '@/lib/format';
import { getWalletSnapshot, parseEgpInputToPiasters, topUpWallet } from '@/lib/wallet-store';
import { useTranslation } from 'react-i18next';

const WalletPage = () => {
  const { t } = useTranslation('wallet');
  const { user, language } = useAuth();
  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [topupAmount, setTopupAmount] = useState('');
  const [showTopup, setShowTopup] = useState(false);
  const [loading, setLoading] = useState(true);

  const refreshWallet = useCallback(async () => {
    if (!user) {
      setWallet(null);
      setTransactions([]);
      setLoading(false);
      return;
    }

    try {
      const snapshot = await getWalletSnapshot(user.id);
      setWallet(snapshot.wallet);
      setTransactions(snapshot.transactions);
    } catch {
      // Keep current state on error
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refreshWallet();
  }, [refreshWallet]);

  const handleTopup = async () => {
    if (!user) return;

    const amountPiasters = parseEgpInputToPiasters(topupAmount);
    if (!amountPiasters || amountPiasters <= 0) {
      toast.error(t('topup.invalidAmount'));
      return;
    }

    setLoading(true);
    try {
      const snapshot = await topUpWallet(user.id, amountPiasters);
      setWallet(snapshot.wallet);
      setTransactions(snapshot.transactions);
      setShowTopup(false);
      setTopupAmount('');
      toast.success(t('topup.success'));
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t('topup.error'));
    } finally {
      setLoading(false);
    }
  };

  const txIcon = (direction: string) =>
    direction === 'credit' ? (
      <ArrowDownCircle className="h-6 w-6 text-green-500" />
    ) : (
      <ArrowUpCircle className="h-6 w-6 text-red-500" />
    );

  return (
    <Layout title={t('title')}>
      <PageTransition>
        <section className="relative py-14 md:py-20 overflow-hidden">
          <GradientMesh />
          <div className="container relative px-4 max-w-2xl space-y-7">
            <SR>
              <Card className="bg-gradient-to-br from-primary/15 to-accent/10 border-primary/20 rounded-2xl shadow-xl overflow-hidden">
                <CardContent className="p-10 text-center">
                  {loading ? (
                    <div className="space-y-4 flex flex-col items-center">
                      <Skeleton shape="circle" w="w-16" h="h-16" />
                      <Skeleton w="w-40" h="h-12" />
                      <Skeleton w="w-24" h="h-6" />
                    </div>
                  ) : (
                    <>
                      <div className="h-16 w-16 mx-auto mb-5 rounded-2xl bg-primary/20 flex items-center justify-center">
                        <Wallet className="h-9 w-9 text-primary" />
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{t('balance.label')}</p>
                      <p className="text-6xl font-bold text-foreground">
                        {wallet ? formatPrice(wallet.balance) : '0'}
                      </p>
                      <p className="text-lg text-muted-foreground mt-2">{t('balance.currencyLine')}</p>
                      <div className="flex gap-3 justify-center mt-8">
                        <Button
                          onClick={() => setShowTopup((current) => !current)}
                          size="lg"
                          className="h-14 px-8 rounded-xl hover:scale-[1.03] transition-transform"
                        >
                          <Plus className="h-5 w-5 me-2" />
                          {t('topup.btn')}
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </SR>

            {showTopup && (
              <SR>
                <Card className="border-primary/30 rounded-2xl">
                  <CardContent className="p-7 space-y-5">
                    <h3 className="font-bold text-lg">{t('topup.title')}</h3>
                    <div className="flex gap-2">
                      {[100, 250, 500, 1000].map((amt) => (
                        <Button
                          key={amt}
                          variant="outline"
                          size="sm"
                          className="hover:scale-[1.05] transition-transform rounded-lg"
                          onClick={() => setTopupAmount(String(amt))}
                        >
                          {amt}
                        </Button>
                      ))}
                    </div>
                    <Input
                      type="number"
                      min="1"
                      step="0.01"
                      placeholder={t('topup.otherAmountPlaceholder')}
                      value={topupAmount}
                      onChange={(e) => setTopupAmount(e.target.value)}
                      className="h-12 rounded-xl"
                    />
                    <div className="flex gap-3">
                      <Button
                        onClick={() => void handleTopup()}
                        className="flex-1 h-12 rounded-xl hover:scale-[1.02] transition-transform"
                      >
                        <CreditCard className="h-5 w-5 me-2" />
                        {t('topup.submitBtn')}
                      </Button>
                      <Button
                        variant="outline"
                        className="h-12 rounded-xl"
                        onClick={() => setShowTopup(false)}
                      >
                        {t('topup.cancelBtn')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </SR>
            )}

            <SR delay={200}>
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-xl">{t('transactions.title')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {loading ? (
                    [1, 2, 3].map((i) => <Skeleton key={i} h="h-16" className="rounded-xl" />)
                  ) : transactions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-10">{t('transactions.empty')}</p>
                  ) : (
                    transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors duration-200"
                      >
                        <div className="flex items-center gap-4">
                          {txIcon(tx.direction)}
                          <div>
                            <p className="font-semibold text-sm">{tx.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(tx.created_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}
                            </p>
                          </div>
                        </div>
                        <div className="text-start">
                          <p
                            className={`font-bold text-lg ${tx.direction === 'credit' ? 'text-green-600' : 'text-red-500'}`}
                          >
                            {tx.direction === 'credit' ? '+' : '-'}
                            {formatPrice(tx.amount)} {t('transactions.currency')}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {tx.status === 'completed'
                              ? t('transactions.status.completed')
                              : t('transactions.status.pending')}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </SR>
          </div>
        </section>
      </PageTransition>
    </Layout>
  );
};

export default WalletPage;
