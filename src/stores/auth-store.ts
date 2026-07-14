"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";
import { SEED_USERS } from "@/data/seed";

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

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      users: SEED_USERS,

      login: (email, password) => {
        const user = get().users.find(
          (u) => u.email === email && u.password === password
        );
        if (user) {
          set({ currentUser: user });
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
        set((s) => ({ users: [...s.users, newUser] }));
      },

      updateUser: (id, data) => {
        set((s) => ({
          users: s.users.map((u) => (u.id === id ? { ...u, ...data } : u)),
          currentUser:
            s.currentUser?.id === id
              ? { ...s.currentUser, ...data }
              : s.currentUser,
        }));
      },

      removeUser: (id) => {
        set((s) => ({
          users: s.users.filter((u) => u.id !== id),
          currentUser: s.currentUser?.id === id ? null : s.currentUser,
        }));
      },

      resetUsers: () => set({ users: SEED_USERS }),
    }),
    { name: "smm-auth" }
  )
);
