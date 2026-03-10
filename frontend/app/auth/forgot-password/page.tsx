"use client"

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const t = useTranslations("auth");

  const validateEmail = (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value) {
      setEmailError(t("emailRequired"));
      return false;
    }
    if (!emailRegex.test(value)) {
      setEmailError(t("emailInvalid"));
      return false;
    }
    setEmailError("");
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateEmail(email)) return;

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("resetError");
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container flex items-center justify-center min-h-screen py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <Link href="/auth/login" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground w-fit mb-2">
            <ArrowLeft className="h-4 w-4" />
            {t("backToLogin")}
          </Link>
          <CardTitle className="text-2xl">{t("resetPassword")}</CardTitle>
          <CardDescription>
            {t("resetPasswordDesc")}
          </CardDescription>
        </CardHeader>

        {success ? (
          <CardContent>
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <h3 className="text-lg font-semibold">{t("resetEmailSent")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("resetEmailSentDesc", { email })}
              </p>
            </div>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p className="flex-1">{error}</p>
                </div>
              )}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  {t("email")}
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError("");
                  }}
                  onBlur={() => validateEmail(email)}
                  required
                  disabled={loading}
                  className={emailError ? "border-destructive" : ""}
                />
                {emailError && (
                  <p className="text-sm text-destructive">{emailError}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t("sendingResetLink") : t("sendResetLink")}
              </Button>
            </CardContent>
          </form>
        )}

        <CardFooter className="flex flex-col space-y-4">
          <div className="text-sm text-center text-muted-foreground">
            {t("haveAccount")}{" "}
            <Link href="/auth/login" className="text-primary hover:underline">
              {t("signIn")}
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
