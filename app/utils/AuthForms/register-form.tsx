"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { zodResolver } from "@hookform/resolvers/zod"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { SubmitHandler, useForm } from "react-hook-form"
import { registerValidation, RegisterValidation } from "../AuthValidation/validation"
import Link from "next/link"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { register } from "@/app/services/authservices"
import { signIn } from "next-auth/react"

export function RegisterForm({
  className,
  ...props
}: React.ComponentProps<"div">) {

    const router = useRouter();

    const form = useForm({
        resolver: zodResolver(registerValidation)
    });

    const {formState: {isSubmitting}} = form;

    const onSubmit: SubmitHandler<RegisterValidation> = async (data) => {
      try {
          const result = await register(data);
          
          if (result.success) {
              toast.success("Registered successfully! Please login.");
              form.reset();
              
              const login = await signIn("credentials", {
                email: data.email,
                password: data.password,
                callbackUrl: "/",
              });

              if (login?.ok) {
                toast.success("Login successful");
                router.refresh();
              } else {
                toast.error("Login failed");
              }
          } else {
              toast.error(result.message || "Registration failed");
          }
      } catch (error) {
          console.error("Registration submission error:", error);
          toast.error(error instanceof Error ? error.message : "Registration failed");
      }
    }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Register</CardTitle>
          <CardDescription>
            Register to your Acme Inc account
          </CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                    <FormField control={form.control} name="name" render={({field}) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input type="text" {...field} value={field.value || ''} placeholder="Enter Your Name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    
                    <FormField control={form.control} name="email" render={({field}) => (
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                            <Input type="email" {...field} value={field.value || ''} placeholder="Enter Your Email" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="password" render={({field}) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} value={field.value || ''} placeholder="Enter Your Password" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <Button type="submit" className="w-full">
                        {isSubmitting ? "Loading..." : "Register"}
                    </Button>

                    <div className="text-center text-sm">
                    Don&apos;t have an account?{" "}
                        <Link href="/login" className="underline underline-offset-4">
                            Sign in
                        </Link>
                    </div>
                </form>
            </Form>
        </CardContent>
      </Card>
    </div>
  )
}
