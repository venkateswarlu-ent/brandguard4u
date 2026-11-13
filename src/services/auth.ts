import { UserProfile, Organisation, UserRole } from '../types';

export const DEMO_ORGANISATIONS: Organisation[] = [
  {
    id: 'org-novapay',
    name: 'NovaPay Global Fintech Inc.',
    domain: 'novapay.com',
    createdAt: '2026-01-10T08:00:00.000Z',
  },
  {
    id: 'org-acme-cloud',
    name: 'Acme Cloud Enterprises Ltd.',
    domain: 'acme.com',
    createdAt: '2026-01-15T09:00:00.000Z',
  },
];

export const DEMO_USER_PROFILES: UserProfile[] = [
  {
    id: 'user-novapay-creator',
    organisationId: 'org-novapay',
    organisationName: 'NovaPay Global Fintech Inc.',
    role: 'Creator',
    displayName: 'Arjun Mehta',
    email: 'arjun@novapay.com',
  },
  {
    id: 'user-novapay-reviewer',
    organisationId: 'org-novapay',
    organisationName: 'NovaPay Global Fintech Inc.',
    role: 'Reviewer',
    displayName: 'Sunita Rao (Legal & Compliance)',
    email: 'sunita@novapay.com',
  },
  {
    id: 'user-novapay-admin',
    organisationId: 'org-novapay',
    organisationName: 'NovaPay Global Fintech Inc.',
    role: 'Admin',
    displayName: 'Vikram Joshi (VP Governance)',
    email: 'vikram@novapay.com',
  },
  {
    id: 'user-acme-creator',
    organisationId: 'org-acme-cloud',
    organisationName: 'Acme Cloud Enterprises Ltd.',
    role: 'Creator',
    displayName: 'Jordan Vance (Growth Marketing)',
    email: 'jordan@acme.com',
  },
  {
    id: 'user-acme-reviewer',
    organisationId: 'org-acme-cloud',
    organisationName: 'Acme Cloud Enterprises Ltd.',
    role: 'Reviewer',
    displayName: 'Elena Rostova (Compliance Director)',
    email: 'elena@acme.com',
  },
  {
    id: 'user-acme-admin',
    organisationId: 'org-acme-cloud',
    organisationName: 'Acme Cloud Enterprises Ltd.',
    role: 'Admin',
    displayName: 'Marcus Chen (CISO & Administrator)',
    email: 'marcus@acme.com',
  },
];

const AUTH_STORAGE_KEY = 'brandguard_auth_session';

export class AuthService {
  private static cachedUser: UserProfile | null = null;

  public static isSupabaseConfigured(): boolean {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    return Boolean(url && key && url !== 'https://your-project-id.supabase.co');
  }

  public static getCurrentUser(): UserProfile {
    if (this.cachedUser) return this.cachedUser;

    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        this.cachedUser = parsed;
        return parsed;
      } catch (e) {
        console.warn('Failed to parse stored auth session:', e);
      }
    }

    // Default to NovaPay Reviewer so all controls are immediately visible and operational
    const defaultUser = DEMO_USER_PROFILES[1]; // Sunita Rao (Reviewer, NovaPay)
    this.cachedUser = defaultUser;
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(defaultUser));
    return defaultUser;
  }

  public static getCurrentOrg(): Organisation {
    const user = this.getCurrentUser();
    const org = DEMO_ORGANISATIONS.find((o) => o.id === user.organisationId);
    return (
      org || {
        id: user.organisationId,
        name: user.organisationName,
        createdAt: new Date().toISOString(),
      }
    );
  }

  public static async login(email: string, role?: UserRole): Promise<UserProfile> {
    const cleanEmail = email.trim().toLowerCase();

    // Check if matching demo profile exists
    const matched = DEMO_USER_PROFILES.find((p) => p.email.toLowerCase() === cleanEmail);
    if (matched) {
      this.cachedUser = matched;
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(matched));
      return matched;
    }

    // Custom email login
    const isAcme = cleanEmail.includes('acme');
    const org = isAcme ? DEMO_ORGANISATIONS[1] : DEMO_ORGANISATIONS[0];
    const newUser: UserProfile = {
      id: `user-${Date.now()}`,
      organisationId: org.id,
      organisationName: org.name,
      role: role || (cleanEmail.includes('review') ? 'Reviewer' : cleanEmail.includes('admin') ? 'Admin' : 'Creator'),
      displayName: cleanEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      email: cleanEmail,
    };

    this.cachedUser = newUser;
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
    return newUser;
  }

  public static async switchProfile(profileId: string): Promise<UserProfile> {
    const profile = DEMO_USER_PROFILES.find((p) => p.id === profileId);
    if (!profile) {
      throw new Error(`Profile ${profileId} not found`);
    }
    this.cachedUser = profile;
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
    return profile;
  }

  public static async logout(): Promise<void> {
    this.cachedUser = null;
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }

  // Server-side & Client-side Permission Enforcement Checkers
  public static canApprove(user: UserProfile = this.getCurrentUser()): boolean {
    return user.role === 'Admin' || user.role === 'Reviewer';
  }

  public static isCreator(user: UserProfile = this.getCurrentUser()): boolean {
    return user.role === 'Creator';
  }

  public static isAdmin(user: UserProfile = this.getCurrentUser()): boolean {
    return user.role === 'Admin';
  }

  /**
   * Enforces role check on critical actions. Throws if forbidden.
   */
  public static assertCanApprove(user: UserProfile = this.getCurrentUser()): void {
    if (!this.canApprove(user)) {
      throw new Error(
        `Access Denied: User "${user.displayName}" with role "${user.role}" is prohibited from approving submissions. Only Reviewer or Admin may approve.`
      );
    }
  }
}
