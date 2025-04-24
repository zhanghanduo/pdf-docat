import React from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Layout } from "@/components/Layout";
import { useLanguage } from "@/hooks/use-language";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type FormValues = z.infer<typeof formSchema>;

const RegisterPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useLanguage();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      const response = await authApi.register(values.name, values.email, values.password, values.confirmPassword);
      
      // Store token and user data in localStorage
      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(response.user));
      
      toast({
        title: t("registration.success", "Registration successful"),
        description: t("registration.successDesc", "Your account has been created successfully"),
      });
      
      // Redirect to dashboard
      setLocation("/dashboard");
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || "An error occurred during registration";
      
      toast({
        title: t("registration.failed", "Registration failed"),
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <Layout showNavbar={false} showFooter={false}>
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            DocCat
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {t("app.description", "AI-powered PDF extraction and analysis")}
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium text-center mb-4">
                {t("registration.title", "Create a new account")}
              </h3>
              
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("registration.name", "Full name")}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t("registration.namePlaceholder", "Enter your name")}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("registration.email", "Email address")}</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder={t("registration.emailPlaceholder", "Enter your email")}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("registration.password", "Password")}</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder={t("registration.passwordPlaceholder", "Create a password")}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("registration.confirmPassword", "Confirm password")}</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder={t("registration.confirmPasswordPlaceholder", "Confirm your password")}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full mt-4"
                    disabled={form.formState.isSubmitting}
                  >
                    {form.formState.isSubmitting 
                      ? t("registration.submitting", "Creating account...") 
                      : t("registration.submit", "Create account")}
                  </Button>
                </form>
              </Form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  {t("registration.alreadyHaveAccount", "Already have an account?")}{" "}
                  <a 
                    href="/login" 
                    className="font-medium text-blue-600 hover:text-blue-500"
                    onClick={(e) => {
                      e.preventDefault();
                      setLocation("/login");
                    }}
                  >
                    {t("registration.signIn", "Sign in")}
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default RegisterPage;