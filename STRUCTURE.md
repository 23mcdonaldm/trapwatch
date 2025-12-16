# Frontend Structure Overview

## 📁 Directory Structure

```
trapwatch/
├── components/          # Reusable UI components
│   ├── FiltersBar.tsx
│   ├── GameComponents.tsx
│   ├── LiveChatBanner.tsx
│   ├── ShareComponents.tsx
│   └── TrapGameCard.tsx
│
├── contexts/           # React Context providers
│   └── authContext/
│       └── index.tsx   # Firebase Auth context
│
├── data/              # Static data files
│   └── teams.ts
│
├── firebase/          # Firebase configuration
│   ├── auth.ts        # Auth functions
│   └── firebase.ts    # Firebase initialization
│
├── hooks/             # Custom React hooks
│   ├── useAuthState.ts  # Auth state management hook
│   └── useTheme.ts      # Theme management hook
│
├── layouts/           # Layout components
│   └── MainLayout.tsx  # Main app layout wrapper
│
├── pages/             # Page components (routes)
│   ├── Alerts.tsx
│   ├── Dashboard.tsx
│   ├── GameDetail.tsx
│   ├── Scoreboard.tsx
│   └── Settings.tsx
│
├── routes/            # Route configuration
│   └── index.tsx      # AppRoutes component
│
├── services/          # Business logic services
│   └── storage.ts     # LocalStorage service
│
├── App.tsx            # Main app component
├── index.tsx          # Entry point
└── types.ts           # TypeScript type definitions
```

## 🎯 Key Improvements

### 1. **Separated Routes** (`routes/index.tsx`)
- All route definitions in one place
- Easier to maintain and add new routes
- Cleaner `App.tsx`

### 2. **Layout Components** (`layouts/MainLayout.tsx`)
- Reusable layout wrapper
- Consistent structure across pages
- Easy to add headers, footers, or sidebars

### 3. **Custom Hooks** (`hooks/`)
- `useTheme()` - Theme initialization and toggle
- `useAuthState()` - Auth state management
- Reusable logic extracted from components

### 4. **Cleaner App.tsx**
- Minimal setup code
- Focus on app structure, not implementation details

## 🔄 Migration Notes

The structure maintains backward compatibility. Existing imports still work, but you can now:

- Use `useTheme()` hook instead of manual theme setup
- Use `useAuthState()` hook for consistent auth state
- Add new routes in `routes/index.tsx`
- Create additional layouts in `layouts/`

## 📝 Next Steps (Optional)

Consider:
- Adding a `utils/` folder for helper functions
- Creating `components/ui/` for base UI components
- Adding `lib/` for third-party integrations
- Setting up route guards for protected routes

