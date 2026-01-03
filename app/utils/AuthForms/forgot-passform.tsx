"use client"

import { cn } from "@/lib/utils"

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { ForgotPasswordType } from "@/app/types"
import { forgotPassword } from "@/app/services/authservices"

const ForgotPasswordForm = ({
    className,
    ...props
  }: React.ComponentProps<"div">) => {

    const form = useForm<ForgotPasswordType>({
        defaultValues: {
            email: ""
        }
    });

    const {formState: {isSubmitting}} = form;

    const onSubmit = async (data: ForgotPasswordType) => {
        try {
            const res = await forgotPassword(data);

            if (res?.success) {
                toast.success(res.message);
            } else {
                toast.error(res?.message || res?.error);
            }
        } catch (error) {
            console.log(error);
        }
    }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card className="overflow-hidden p-0">
            <CardContent className="grid p-0 md:grid-cols-2">
            
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 md:p-8">
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col items-center text-center">
                            <h1 className="text-2xl font-bold">SendReset Link</h1>
                            <p className="text-muted-foreground text-balance">
                                Enter Your Send Email
                            </p>
                        </div>
                        <FormField control={form.control} name="email" render={({field}) => (
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                            <Input type="email" {...field} value={field.value || ''} placeholder="Enter Your Email" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )} />

                        <Button type="submit" className="w-full">
                            {isSubmitting ? "Loading..." : "reset Password"}
                        </Button>
                    </div>
                </form>
            </Form>
            </CardContent>
        </Card>
    </div>
  )
}

export default ForgotPasswordForm