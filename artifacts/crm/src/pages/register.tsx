import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRegister } from "@workspace/api-client-react";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { registrationFormSchema, type RegistrationFormValues } from "@/lib/registration-schema";

function getRegistrationError(error: unknown): string {
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? error.status
      : undefined;

  if (status === 409) return "An account with this email already exists. Try signing in.";
  if (status === 400) return "Please check your name, email, and password requirements.";
  if (status === 429) return "Too many sign-up attempts. Please try again later.";
  return "We could not create your account right now. Please try again later.";
}

export default function Register() {
  const registrationMutation = useRegister();
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationFormSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  function onSubmit(values: RegistrationFormValues) {
    setServerError(null);
    registrationMutation.mutate(
      { data: { name: values.name, email: values.email, password: values.password } },
      {
        onSuccess: () => setRegisteredEmail(values.email),
        onError: (error) => setServerError(getRegistrationError(error)),
      },
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
          <p className="text-zinc-400 mt-2">Create your CRM account</p>
        </div>

        <Card className="border-zinc-800 bg-zinc-900 shadow-xl">
          <CardHeader>
            <CardTitle className="text-white">
              {registeredEmail ? "Account created" : "Create an account"}
            </CardTitle>
            <CardDescription className="text-zinc-400">
              {registeredEmail
                ? "Your account is ready. Sign in to continue."
                : "Sign up to manage your own leads."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {registeredEmail ? (
              <div className="space-y-4">
                <Alert>
                  <AlertTitle>Registration successful</AlertTitle>
                  <AlertDescription>
                    Your account for {registeredEmail} was created. You can now sign in.
                  </AlertDescription>
                </Alert>
                <Button asChild className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold">
                  <Link href="/login">Go to sign in</Link>
                </Button>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-zinc-300">Full name</FormLabel>
                        <FormControl>
                          <Input autoComplete="name" className="bg-zinc-800 border-zinc-700 text-white" {...field} />
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
                        <FormLabel className="text-zinc-300">Email address</FormLabel>
                        <FormControl>
                          <Input type="email" autoComplete="email" className="bg-zinc-800 border-zinc-700 text-white" {...field} />
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
                          <Input type="password" autoComplete="new-password" className="bg-zinc-800 border-zinc-700 text-white" {...field} />
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
                        <FormLabel className="text-zinc-300">Confirm password</FormLabel>
                        <FormControl>
                          <Input type="password" autoComplete="new-password" className="bg-zinc-800 border-zinc-700 text-white" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <p className="text-xs text-zinc-400">Use 12 or more characters. Passwords are case-sensitive.</p>
                  {serverError && (
                    <Alert variant="destructive">
                      <AlertTitle>Registration failed</AlertTitle>
                      <AlertDescription>{serverError}</AlertDescription>
                    </Alert>
                  )}
                  <Button
                    type="submit"
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold"
                    disabled={registrationMutation.isPending}
                  >
                    {registrationMutation.isPending ? "Creating account..." : "Create account"}
                  </Button>
                </form>
              </Form>
            )}
            {!registeredEmail && (
              <p className="text-center text-sm text-zinc-400 mt-5">
                Already have an account? <Link href="/login" className="text-orange-400 hover:text-orange-300">Sign in</Link>
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
