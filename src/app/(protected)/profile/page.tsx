"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import {
  changeUserPassword,
  fetchUserProfile,
  updateUserProfile,
  uploadProfileAvatar,
  type UserProfileData,
} from "@/lib/api/profile";
import {
  Camera,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  RotateCcw,
  Save,
  Shield,
  Trash2,
  UploadCloud,
  User,
} from "lucide-react";

export default function ProfilePage() {
  const { user, updateCurrentUser } = useAuth();
  const { addToast } = useToast();

  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states - Personal Info
  const [fullName, setFullName] = useState("");
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Form states - Change Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load user profile on mount
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await fetchUserProfile();
      setProfile(data);
      setFullName(data.fullName || "");
      setProfilePictureUrl(data.profilePictureUrl || null);
    } catch (err) {
      console.error("Failed to load profile", err);
      addToast("Failed to load profile data", "destructive");
    } finally {
      setLoading(false);
    }
  };

  // Handle avatar upload
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      addToast("Profile picture must be under 5MB", "destructive");
      return;
    }

    try {
      setUploadingAvatar(true);
      const uploadedUrl = await uploadProfileAvatar(file);
      setProfilePictureUrl(uploadedUrl);

      // Auto-save the new picture to profile
      const updated = await updateUserProfile({
        fullName: fullName.trim() || profile?.fullName,
        profilePictureUrl: uploadedUrl,
      });

      setProfile(updated);
      updateCurrentUser({
        fullName: updated.fullName,
        profilePictureUrl: updated.profilePictureUrl,
      });

      addToast("Profile picture updated successfully!");
    } catch (err) {
      console.error("Failed to upload avatar", err);
      addToast(err instanceof Error ? err.message : "Failed to upload image", "destructive");
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Handle remove avatar
  const handleRemoveAvatar = async () => {
    try {
      setSavingProfile(true);
      const updated = await updateUserProfile({
        fullName: fullName.trim() || profile?.fullName,
        profilePictureUrl: "",
      });

      setProfilePictureUrl(null);
      setProfile(updated);
      updateCurrentUser({
        fullName: updated.fullName,
        profilePictureUrl: null,
      });

      addToast("Profile picture removed");
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to remove photo", "destructive");
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle update personal info
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      addToast("Full Name cannot be empty", "destructive");
      return;
    }

    try {
      setSavingProfile(true);
      const updated = await updateUserProfile({
        fullName: fullName.trim(),
        profilePictureUrl: profilePictureUrl,
      });

      setProfile(updated);
      updateCurrentUser({
        fullName: updated.fullName,
        profilePictureUrl: updated.profilePictureUrl,
      });

      addToast("Profile updated successfully!");
    } catch (err) {
      console.error("Failed to update profile", err);
      addToast(err instanceof Error ? err.message : "Failed to update profile", "destructive");
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle change password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      addToast("Please enter your current password", "destructive");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      addToast("New password must be at least 6 characters", "destructive");
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast("New passwords do not match", "destructive");
      return;
    }

    try {
      setChangingPassword(true);
      const res = await changeUserPassword({
        currentPassword,
        newPassword,
      });

      addToast(res.message || "Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error("Password change failed", err);
      addToast(err instanceof Error ? err.message : "Failed to change password", "destructive");
    } finally {
      setChangingPassword(false);
    }
  };

  const initials = (profile?.fullName || user?.fullName || "User")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#9e3600] border-t-transparent" />
          <p className="text-sm font-medium text-neutral-500">Loading profile details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="border-b border-neutral-200 pb-4">
        <h1 className="text-2xl font-bold text-[#9e3600]">My Profile & Settings</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Manage your account credentials, avatar picture, and password security.
        </p>
      </div>

      {/* ── Top Profile Summary Banner ─────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          {/* Avatar with upload overlay */}
          <div className="relative group">
            <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#9e3600] text-2xl font-bold text-white shadow-md ring-4 ring-[#9e3600]/10">
              {profilePictureUrl ? (
                <img
                  src={profilePictureUrl}
                  alt={profile?.fullName || "Profile"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>{initials}</span>
              )}

              {/* Uploading overlay */}
              {uploadingAvatar && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                </div>
              )}
            </div>

            {/* Change picture button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#9e3600] text-white shadow-md transition-transform hover:scale-110 hover:bg-[#b33f00] disabled:cursor-not-allowed"
              title="Upload new photo"
            >
              <Camera className="h-4 w-4" />
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          {/* User brief info */}
          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <h2 className="text-xl font-bold text-neutral-800">
                {profile?.fullName || "Administrator"}
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#9e3600]/10 px-2.5 py-0.5 text-xs font-semibold text-[#9e3600]">
                <Shield className="h-3 w-3" />
                {profile?.role || "ADMIN"}
              </span>
            </div>

            <p className="mt-1 text-sm font-medium text-neutral-500">
              @{profile?.username}
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-neutral-500 sm:justify-start">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Account Status: Active</span>
              </div>
              {profile?.createdAt && (
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-neutral-400" />
                  <span>
                    Member since {new Date(profile.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Avatar Actions */}
          {profilePictureUrl && (
            <button
              type="button"
              onClick={handleRemoveAvatar}
              disabled={savingProfile}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove Photo
            </button>
          )}
        </div>
      </div>

      {/* ── Two Column Forms: Personal Info & Security ──────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* ── Card 1: Personal Details ──────────────────────────────── */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs">
          <div className="mb-5 flex items-center gap-2.5 border-b border-neutral-100 pb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#9e3600]/10 text-[#9e3600]">
              <User className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-800">Personal Information</h3>
              <p className="text-xs text-neutral-500">Update your display name and view account role</p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="edit-fullname"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter full name"
                className="mt-1.5 h-10 w-full rounded-lg border border-neutral-200 bg-white px-3.5 text-sm text-neutral-800 outline-none transition-all focus:border-[#9e3600] focus:ring-2 focus:ring-[#9e3600]/10"
                required
              />
            </div>

            {/* Username (Read-Only) */}
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-neutral-700">
                  Username
                </label>
                <span className="flex items-center gap-1 text-[11px] font-medium text-neutral-400">
                  <Lock className="h-3 w-3" /> Read-only
                </span>
              </div>
              <input
                type="text"
                value={profile?.username || ""}
                disabled
                className="mt-1.5 h-10 w-full rounded-lg border border-neutral-200 bg-neutral-100 px-3.5 text-sm text-neutral-500 cursor-not-allowed"
              />
            </div>

            {/* Assigned Role (Read-Only) */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700">
                Assigned Role
              </label>
              <div className="mt-1.5 flex h-10 w-full items-center justify-between rounded-lg border border-neutral-200 bg-neutral-100 px-3.5 text-sm text-neutral-600">
                <span>{profile?.role || "ADMIN"}</span>
                <Shield className="h-4 w-4 text-[#9e3600]" />
              </div>
            </div>

            {/* Save Profile Button */}
            <div className="pt-3">
              <button
                id="save-profile-btn"
                type="submit"
                disabled={savingProfile}
                className="flex h-10 items-center justify-center gap-2 rounded-lg bg-[#9e3600] px-5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#b33f00] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingProfile ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save Profile Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* ── Card 2: Security & Password ──────────────────────────── */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs">
          <div className="mb-5 flex items-center gap-2.5 border-b border-neutral-100 pb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#9e3600]/10 text-[#9e3600]">
              <KeyRound className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-800">Change Password</h3>
              <p className="text-xs text-neutral-500">Ensure your account uses a strong, secure password</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            {/* Current Password */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700">
                Current Password <span className="text-red-500">*</span>
              </label>
              <div className="relative mt-1.5">
                <input
                  id="current-password"
                  type={showCurrentPass ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="h-10 w-full rounded-lg border border-neutral-200 bg-white pl-3.5 pr-10 text-sm text-neutral-800 outline-none transition-all focus:border-[#9e3600] focus:ring-2 focus:ring-[#9e3600]/10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  {showCurrentPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700">
                New Password <span className="text-red-500">*</span>
              </label>
              <div className="relative mt-1.5">
                <input
                  id="new-password"
                  type={showNewPass ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="h-10 w-full rounded-lg border border-neutral-200 bg-white pl-3.5 pr-10 text-sm text-neutral-800 outline-none transition-all focus:border-[#9e3600] focus:ring-2 focus:ring-[#9e3600]/10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  {showNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {newPassword && newPassword.length < 6 && (
                <p className="mt-1 text-xs text-amber-600">Password must be at least 6 characters</p>
              )}
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700">
                Confirm New Password <span className="text-red-500">*</span>
              </label>
              <div className="relative mt-1.5">
                <input
                  id="confirm-password"
                  type={showConfirmPass ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                  className="h-10 w-full rounded-lg border border-neutral-200 bg-white pl-3.5 pr-10 text-sm text-neutral-800 outline-none transition-all focus:border-[#9e3600] focus:ring-2 focus:ring-[#9e3600]/10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  {showConfirmPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
              )}
            </div>

            {/* Update Password Button */}
            <div className="pt-3">
              <button
                id="update-password-btn"
                type="submit"
                disabled={changingPassword}
                className="flex h-10 items-center justify-center gap-2 rounded-lg bg-neutral-900 px-5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                {changingPassword ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    <span>Update Password</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
