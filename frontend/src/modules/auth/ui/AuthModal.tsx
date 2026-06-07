"use client";

import { api, type TwoFactorMethod, type UserProfile } from "@/api";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { qk } from "@/shared/queries/query-keys";
import { useAuthStore } from "@/shared/stores/auth-store";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, ViewTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { BackgroundDecor } from "./BackgroundDecor";
import { FieldWithIcon } from "./FieldWithIcon";
import { TwoFactorStep } from "./TwoFactorStep";

interface PendingChallenge {
  challengeId: string;
  primary: TwoFactorMethod;
  methods: TwoFactorMethod[];
  expiresAt: number;
}

export default function AuthModal() {
  const { t } = useTranslation("modules.auth");

  const loginSchema = useMemo(
    () =>
      z.object({
        username: z
          .string()
          .min(3, t("modal.form.username.errors.min"))
          .max(32, t("modal.form.username.errors.max"))
          .regex(/^[a-zA-Z0-9_]+$/, t("modal.form.username.errors.regex")),
        password: z
          .string()
          .min(6, t("modal.form.password.errors.min"))
          .max(64, t("modal.form.password.errors.max")),
      }),
    [t]
  );

  type LoginFormValues = z.infer<typeof loginSchema>;

  const [error, setError] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending2fa, setPending2fa] = useState<PendingChallenge | null>(null);

  const login = useAuthStore((s) => s.login);
  const queryClient = useQueryClient();
  const router = useRouter();

  const finalizeLogin = (token: string, user: UserProfile) => {
    login(token, user);
    queryClient.removeQueries({ queryKey: qk.auth.all });
    router.push("/");
  };

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
    mode: "onChange",
  });

  const {
    formState: { isSubmitting, isValid, errors },
  } = form;

  const onSubmit = async (data: LoginFormValues) => {
    setError("");
    try {
      const response = await api.auth.login(data);
      if (
        response.require2fa &&
        response.challengeId &&
        response.primary &&
        response.methods
      ) {
        setPending2fa({
          challengeId: response.challengeId,
          primary: response.primary,
          methods: response.methods,
          expiresAt: response.expiresAt ?? Date.now() + 3 * 60 * 1000,
        });
        return;
      }
      if (response.token && response.user) {
        finalizeLogin(response.token, response.user);
      }
    } catch (err: any) {
      if (err.response) {
        try {
          const errorData = await err.response.json();
          setError(errorData.message || t("modal.errors.loginFailed"));
        } catch {
          setError(t("modal.errors.invalidResponse"));
        }
      } else if (err.name === "HTTPError") {
        setError(t("modal.errors.networkError"));
      } else {
        setError(err.message || t("modal.errors.unexpected"));
      }
    }
  };

  return (
    <ViewTransition exit="auth-exit" default="none">
      <div className="relative min-h-screen overflow-hidden bg-background">
        <BackgroundDecor />

        <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-4 py-10">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, ease: "easeOut" }}
            className="w-full rounded-2xl border border-border/60 bg-card/85 p-7 shadow-xl backdrop-blur-md sm:p-9"
          >
            <div className="mb-7 space-y-1.5 text-center">
              <p className="text-xs font-semibold tracking-[0.25em] text-primary uppercase">
                {t("modal.eyebrow")}
              </p>
              <h1 className="text-2xl font-bold text-foreground">
                {t("modal.title")}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t("modal.description")}
              </p>
            </div>

            {pending2fa ? (
              <TwoFactorStep
                challengeId={pending2fa.challengeId}
                primary={pending2fa.primary}
                methods={pending2fa.methods}
                expiresAt={pending2fa.expiresAt}
                onSuccess={finalizeLogin}
                onCancel={() => {
                  setPending2fa(null);
                  form.reset();
                }}
              />
            ) : (
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
                noValidate
              >
                <FieldWithIcon
                  id="username"
                  label={t("modal.form.username.label")}
                  icon={User}
                  autoComplete="username"
                  placeholder={t("modal.form.username.placeholder")}
                  disabled={isSubmitting}
                  error={errors.username?.message}
                  {...form.register("username")}
                />

                <FieldWithIcon
                  id="password"
                  label={t("modal.form.password.label")}
                  icon={KeyRound}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder={t("modal.form.password.placeholder")}
                  disabled={isSubmitting}
                  error={errors.password?.message}
                  trailing={
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="flex size-4 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={
                        showPassword
                          ? t("modal.form.password.hidePassword")
                          : t("modal.form.password.showPassword")
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  }
                  {...form.register("password")}
                />

                <Button
                  className="group w-full"
                  type="submit"
                  disabled={isSubmitting || !isValid}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      {t("modal.form.submit.loading")}
                    </>
                  ) : (
                    <>
                      {t("modal.form.submit.default")}
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </Button>

                <AnimatePresence initial={false}>
                  {error ? (
                    <motion.div
                      initial={{ opacity: 0, y: -4, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: -4, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </ViewTransition>
  );
}
