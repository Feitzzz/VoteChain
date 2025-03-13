import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { ComponentType } from 'react';

// HOC to protect routes that require authentication
const withAuth = <P extends object>(Component: ComponentType<P>) => {
  const WithAuth = (props: P) => {
    const router = useRouter();
    const { isAuthenticated, loading } = useSelector((state: RootState) => state.auth);
    
    useEffect(() => {
      // Check if user is authenticated
      if (!loading && !isAuthenticated) {
        // Redirect to login page if not authenticated
        router.replace('/auth/login');
      }
    }, [isAuthenticated, loading, router]);
    
    // Show loading spinner while checking authentication
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      );
    }
    
    // If not authenticated, don't render component
    if (!isAuthenticated) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      );
    }
    
    // If authenticated, render the protected component
    return <Component {...props} />;
  };
  
  // Copy getInitialProps so it will run
  if ((Component as any).getInitialProps) {
    (WithAuth as any).getInitialProps = (Component as any).getInitialProps;
  }
  
  return WithAuth;
};

export default withAuth; 