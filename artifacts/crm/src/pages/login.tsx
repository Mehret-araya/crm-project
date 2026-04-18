import { useEffect } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLogin } from "@workspace/api-client-react";
import { setToken, getToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const loginMutation = useLogin();
  const { toast } = useToast();

  useEffect(() => {
    if (getToken()) {
      setLocation("/");
    }
  }, [setLocation]);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  function fillDemo() {
    form.setValue("email", "admin@crm.com");
    form.setValue("password", "admin123");
  }

  function onSubmit(values: z.infer<typeof loginSchema>) {
    loginMutation.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          setToken(data.token);
          setLocation("/");
        },
        onError: () => {
          toast({
            title: "Login failed",
            description: "Invalid email or password. Please check your credentials and try again.",
            variant: "destructive",
          });
        },
      }
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-orange-500 text-white p-3 rounded-xl mb-4 shadow-lg shadow-orange-500/20">
            <Users size={32} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">MiniCRM</h1>
          <p className="text-zinc-400 mt-2">Sign in to manage your leads</p>
        </div>

        {/* Demo credentials banner */}
        <div className="mb-4 p-3 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-orange-300 font-medium">Demo credentials</p>
            <p className="text-xs text-zinc-400 mt-0.5">admin@crm.com / admin123</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-orange-400 border-orange-500/40 hover:bg-orange-500/10 hover:text-orange-300 shrink-0"
            onClick={fillDemo}
          >
            Fill in
          </Button>
        </div>

        <Card className="border-zinc-800 bg-zinc-900 shadow-xl">
          <CardHeader>
            <CardTitle className="text-white">Welcome back</CardTitle>
            <CardDescription className="text-zinc-400">Enter your credentials to access your account.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-zinc-300">Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="admin@crm.com"
                          autoComplete="email"
                          className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-orange-500"
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
                      <FormLabel className="text-zinc-300">Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          autoComplete="current-password"
                          className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-orange-500"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {loginMutation.isError && (
                  <div className="p-3 bg-red-500/10 text-red-400 text-sm rounded-md border border-red-500/20">
                    Invalid email or password. Please try again.
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
