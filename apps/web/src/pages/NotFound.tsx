import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'react-router';
import { Home } from 'lucide-react';
import { useEffect } from 'react';
import { PageTransition, GradientMesh } from '@/components/motion/PageTransition';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname);
  }, [location.pathname]);

  return (
    <Layout>
      <PageTransition>
        <div className="relative min-h-[60vh] flex items-center justify-center px-4 overflow-hidden">
          <GradientMesh />
          <div className="relative text-center">
            <h1 className="text-9xl font-bold text-primary/20 mb-2 hero-reveal">404</h1>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-5 hero-reveal hero-d1">
              الصفحة غير موجودة
            </h2>
            <p className="text-lg text-muted-foreground mb-10 max-w-md mx-auto hero-reveal hero-d2">
              عذراً، لم نتمكن من العثور على الصفحة التي تبحث عنها. ربما تم نقلها أو حذفها.
            </p>
            <div className="hero-reveal hero-d3">
              <Link to="/">
                <Button
                  size="lg"
                  className="h-14 px-8 rounded-xl text-base hover:scale-[1.05] transition-transform"
                >
                  <Home className="h-5 w-5 ml-2" />
                  العودة للرئيسية
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </PageTransition>
    </Layout>
  );
};

export default NotFound;
