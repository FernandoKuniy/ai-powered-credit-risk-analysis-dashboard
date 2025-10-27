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

  console.log('🛡️ ProtectedRoute render - loading:', loading, 'user:', user?.id, 'user role:', user?.profile?.role, 'requiredRole:', requiredRole);

  useEffect(() => {
    console.log('🛡️ ProtectedRoute useEffect - loading:', loading, 'user:', user?.id, 'requiredRole:', requiredRole);
    
    if (!loading) {
      console.log('🛡️ Loading complete, checking user...');
      if (!user) {
        console.log('🛡️ No user found, redirecting to /auth');
        router.push('/auth');
        return;
      }
      
      console.log('🛡️ User found:', user.id, 'role:', user.profile.role);
      if (requiredRole && user.profile.role !== requiredRole) {
        console.log('🛡️ Role mismatch - user role:', user.profile.role, 'required:', requiredRole, 'redirecting to /');
        router.push('/');
        return;
      }
      
      console.log('🛡️ Access granted for user:', user.id);
    } else {
      console.log('🛡️ Still loading, waiting...');
    }
  }, [user, loading, requiredRole, router]);

  if (loading) {
    console.log('🛡️ ProtectedRoute rendering loading state');
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
    console.log('🛡️ ProtectedRoute rendering null (will redirect)');
    return null; // Will redirect to /auth
  }

  if (requiredRole && user.profile.role !== requiredRole) {
    console.log('🛡️ ProtectedRoute rendering access denied');
    return (
      <div className="card">
        <div className="text-center py-8">
          <p className="text-red-400 mb-4">Access Denied</p>
          <p className="text-white/70">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  console.log('🛡️ ProtectedRoute rendering children for user:', user.id);
  return <>{children}</>;
}
