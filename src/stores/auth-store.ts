"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";
import { SEED_USERS } from "@/data/seed";
import {
  findDemoUser,
  mergeSeedUsers,
  normalizeDemoEmail,
  resolveStoredUser,
} from "@/lib/demo-users";

interface AuthState {
  currentUser: User | null;
  users: User[];
  login: (email: string, password: string) => boolean;
  logout: () => void;
  addUser: (user: Omit<User, "id">) => void;
  updateUser: (id: string, data: Partial<User>) => void;
  removeUser: (id: string) => void;
  resetUsers: () => void;
}

function syncAuthState(state: Pick<AuthState, "users" | "currentUser">) {
  const users = mergeSeedUsers(state.users);
  const currentUser = resolveStoredUser(users, state.currentUser);
  return { users, currentUser };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      users: SEED_USERS,

      login: (email, password) => {
        const normalizedEmail = normalizeDemoEmail(email);
        const users = mergeSeedUsers(get().users);
        const user =
          users.find(
            (item) =>
              item.email === normalizedEmail && item.password === password
          ) ?? findDemoUser(email, password);

        if (user) {
          set({ currentUser: user, users: mergeSeedUsers([...users, user]) });
          return true;
        }
        return false;
      },

      logout: () => set({ currentUser: null }),

      addUser: (userData) => {
        const newUser: User = {
          ...userData,
          id: `user-${Date.now()}`,
        };
        set((s) => ({ users: [...mergeSeedUsers(s.users), newUser] }));
      },

      updateUser: (id, data) => {
        set((s) => {
          const users = s.users.map((u) => (u.id === id ? { ...u, ...data } : u));
          return {
            users,
            currentUser:
              s.currentUser?.id === id
                ? { ...s.currentUser, ...data }
                : s.currentUser,
          };
        });
      },

      removeUser: (id) => {
        set((s) => ({
          users: s.users.filter((u) => u.id !== id),
          currentUser: s.currentUser?.id === id ? null : s.currentUser,
        }));
      },

      resetUsers: () => set({ users: SEED_USERS, currentUser: null }),
    }),
    {
      name: "smm-auth",
      version: 2,
      migrate: (persistedState) => {
        const state = persistedState as Pick<AuthState, "users" | "currentUser">;
        return syncAuthState(state);
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const synced = syncAuthState(state);
        state.users = synced.users;
        state.currentUser = synced.currentUser;
      },
    }
  )
);
