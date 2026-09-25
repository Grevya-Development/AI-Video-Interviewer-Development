"use client";

import React, { useState, useRef } from "react";
import { Camera, Trash2, Check, AlertCircle, Loader2, User as UserIcon, Mail } from "lucide-react";
import { useRouter } from "next/navigation";

interface ProfileFormProps {
  currentUser: {
    email: string;
    name?: string | null;
    avatarUrl?: string | null;
  };
}

export function ProfileForm({ currentUser }: ProfileFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(currentUser.name || "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    currentUser.avatarUrl || null
  );
  const [isAvatarChanged, setIsAvatarChanged] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please select a valid image file (PNG, JPG, WebP).");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setErrorMessage("Image file must be under 8MB.");
      return;
    }

    setErrorMessage(null);
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 400;
        let width = img.width;
        let height = img.height;

        const minSide = Math.min(width, height);
        const startX = (width - minSide) / 2;
        const startY = (height - minSide) / 2;

        canvas.width = Math.min(minSide, maxDim);
        canvas.height = Math.min(minSide, maxDim);

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(
            img,
            startX,
            startY,
            minSide,
            minSide,
            0,
            0,
            canvas.width,
            canvas.height
          );
          const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
          setAvatarPreview(dataUrl);
          setIsAvatarChanged(true);
        }
      };
      img.onerror = () => {
        setErrorMessage("Could not load the selected image. Please try another.");
      };
      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRemovePhoto = () => {
    setAvatarPreview(null);
    setIsAvatarChanged(true);
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage("Please enter your display name.");
      setIsSubmitting(false);
      return;
    }

    try {
      const payload: { name: string; avatarUrl?: string | null } = {
        name: trimmedName,
      };

      if (isAvatarChanged) {
        payload.avatarUrl = avatarPreview;
      }

      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update profile.");
      }

      setSuccessMessage("Profile updated successfully!");
      setIsAvatarChanged(false);
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err?.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errorMessage && (
        <div className="flex items-center gap-2 p-3.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-2xl">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 p-3.5 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-2xl">
          <Check className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Picture Upload */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-2">
          Profile Photo
        </label>
        <div className="flex items-center gap-5">
          <div className="relative group shrink-0">
            <div className="h-24 w-24 rounded-full overflow-hidden bg-slate-100 ring-2 ring-slate-200 shadow-inner flex items-center justify-center">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt={name || "Profile avatar"}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="h-full w-full bg-brand-50 text-brand-600 font-bold text-3xl flex items-center justify-center uppercase">
                  {name ? name.charAt(0) : <UserIcon className="h-10 w-10 text-brand-400" />}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 rounded-full bg-slate-900/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px] cursor-pointer"
              title="Change picture"
            >
              <Camera className="h-6 w-6" />
              <span className="text-[10px] font-semibold mt-0.5">Change</span>
            </button>
          </div>

          <div className="flex-1 space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
              >
                Upload photo
              </button>
              {avatarPreview && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Square PNG, JPG, or WebP recommended. Automatically resized and optimized.
            </p>
          </div>
        </div>
      </div>

      {/* Name Input */}
      <div>
        <label htmlFor="name-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
          Display Name
        </label>
        <input
          id="name-input"
          type="text"
          required
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Alex Morgan"
          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 shadow-2xs"
        />
      </div>

      {/* Email (Read Only) */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="email-input" className="block text-xs font-semibold text-slate-700">
            Email Address
          </label>
          <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            Linked Account
          </span>
        </div>
        <div className="relative">
          <input
            id="email-input"
            type="email"
            disabled
            value={currentUser.email}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-500 cursor-not-allowed select-none"
          />
          <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
        </div>
      </div>

      {/* Save Button */}
      <div className="pt-2 flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-semibold rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white shadow-sm shadow-brand-500/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <span>Save Profile</span>
          )}
        </button>
      </div>
    </form>
  );
}
