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
import { LoginValidation, loginValidation } from "../AuthValidation/validation"
import Link from "next/link"
import { toast } from "sonner"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {

    const router = useRouter();

    const form = useForm({
        resolver: zodResolver(loginValidation)
    });

    const {formState: {isSubmitting}} = form;

    const onSubmit: SubmitHandler<LoginValidation> = async (data) => {
        try {
            const res = await signIn("credentials", {
              email: data.email,
              password: data.password,
              callbackUrl: "/",
            });

            if (res?.ok) {
              toast.success("Logged in successfully!");
              form.reset();
              router.refresh();
            } else {
              toast.error("Failed to login. Please check your credentials.");
            }
        } catch (error) {
            console.log(error);
            toast.error("An unexpected error occurred");
        }
    }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Login to your account</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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
                        {isSubmitting ? "Loading..." : "Login"}
                    </Button>

                    <Link href={"/forgot-password"}>
                        <Button variant={"link"} size={"sm"}>
                            Forgot Password
                        </Button>
                    </Link>

                    <div className="text-center text-sm">
                    Don&apos;t have an account?{" "}
                        <Link href="/register" className="underline underline-offset-4">
                            Sign up
                        </Link>
                    </div>
                </form>
            </Form>
        </CardContent>
      </Card>
    </div>
  )
}
