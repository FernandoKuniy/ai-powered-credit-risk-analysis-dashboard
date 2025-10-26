"use client";
import { useAuth } from "../../lib/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'loan_officer' | 'risk_manager';
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log('ProtectedRoute - loading:', loading, 'user:', user, 'requiredRole:', requiredRole);
    
    if (!loading) {
      if (!user) {
        console.log('ProtectedRoute - No user, redirecting to /auth');
        router.push('/auth');
        return;
      }
      
      if (requiredRole && user.profile.role !== requiredRole) {
        console.log('ProtectedRoute - Wrong role, redirecting to /');
        router.push('/');
        return;
      }
    }
  }, [user, loading, requiredRole, router]);

  if (loading) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white/70">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to /auth
  }

  if (requiredRole && user.profile.role !== requiredRole) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <p className="text-red-400 mb-4">Access Denied</p>
          <p className="text-white/70">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
