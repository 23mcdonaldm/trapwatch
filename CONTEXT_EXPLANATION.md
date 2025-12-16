# Context vs Hooks/State: When to Use What

## The Problem Context Solves: Prop Drilling

**Without Context (prop drilling):**
```tsx
// App.tsx
const [user, setUser] = useState(null);

// Dashboard.tsx - needs user
<Dashboard user={user} />

// Dashboard renders Header
<Header user={user} />

// Header renders UserMenu
<UserMenu user={user} />

// UserMenu finally uses it
{user.name}
```

**With Context:**
```tsx
// App.tsx
<AuthProvider>
  <Dashboard />  {/* No props! */}
</AuthProvider>

// UserMenu.tsx - anywhere in the tree
const { user } = useAuth();  // Direct access!
```

## When You DON'T Need Context

✅ **You're already using a service pattern** (like your `storageService`)
- Components can call `storageService.getUserState()` directly
- No prop drilling needed
- Simpler and more explicit

✅ **Only a few components need the data**
- Just pass props
- Less overhead

✅ **Data doesn't change often**
- Context causes re-renders when value changes
- For static data, just import/use directly

## When You DO Need Context

✅ **Many deeply nested components need the same data**
- Avoid passing props through 5+ levels

✅ **Data changes frequently and many components need updates**
- Theme, auth state, notifications

✅ **You want a single source of truth with automatic updates**
- All components stay in sync automatically

## Your Current Situation

You have **TWO auth systems**:
1. `AuthContext` (Firebase) - only used in Alerts.tsx
2. `storageService` (localStorage) - used everywhere else

**Recommendation:** Pick one approach:
- **Option A:** Use Context everywhere (if you want Firebase auth)
- **Option B:** Use `storageService` everywhere (simpler, what you're already doing)

Since you're already using `storageService` in most places, you probably don't need Context at all!

