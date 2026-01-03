"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { ResetPasswordType } from "@/app/types";
import { resetPassword } from "@/app/services/authservices";
import { toast } from "sonner";


const ResetPasswordForm = () => {


  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  
  const router = useRouter();

  const form = useForm<ResetPasswordType>({
    defaultValues: {
      newPassword: "",
    },
  });

  const { formState: {isSubmitting} } = form;

  const onSubmit = async (data: ResetPasswordType) => {
    if (!token) {
      toast.error("Invalid or missing token.");
      return;
    }
  
    const res = await resetPassword({ ...data, token });
  
    if (!res.success) {
      toast.error(res.message);
    } else {
      toast.success(res.message);
      router.push("/login");
    }
  };
  

  return (
    <Card className="overflow-hidden p-0">
      <CardContent className="grid p-0 md:grid-cols-2">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="p-6 md:p-8"
            noValidate
          >
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center text-center">
                <h1 className="text-2xl font-bold">Reset Password</h1>
                <p className="text-muted-foreground text-balance">
                  Enter your new password below
                </p>
              </div>

              <FormField
                control={form.control}
                name="newPassword"
                rules={{ required: "New password is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        {...field}
                        placeholder="Enter new password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Resetting..." : "Reset Password"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default ResetPasswordForm;
