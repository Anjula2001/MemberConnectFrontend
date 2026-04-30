"use client";

import { forwardRef, useImperativeHandle } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "../input";
import { Button } from "../button";

const bankSchema = z.object({
  bank: z.string().min(1, "Bank is required"),
  branch: z.string().min(1, "Branch is required"),
  accountNumber: z
    .string()
    .min(1, "Account Number is required")
    .regex(/^\d+$/, "Account Number must be numeric"),
});

export type BankFormValues = z.infer<typeof bankSchema>;

export interface AddBankDetailsRef {
  submitBankForm: () => void;
}

interface Props {
  onSave: (data: BankFormValues) => void;
  onClose: () => void;   // ✅ ADD THIS
}

const AddBankDetails = forwardRef<AddBankDetailsRef, Props>(({ onSave,onClose }, ref) => {
  const { register, handleSubmit, formState: { errors } } = useForm<BankFormValues>({
    resolver: zodResolver(bankSchema),
  });

  const onValid = (data: BankFormValues) => {
    onSave(data);
  };

  const onInvalid = (errors: any) => {
    console.log("Bank Form Errors:", errors);
  };


  // Expose submit function to parent
  useImperativeHandle(ref, () => ({
    submitBankForm: handleSubmit(onValid, onInvalid),
  }));

    return (
      <>
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
     <div className="bg-white w-[450px] rounded-lg shadow-lg p-6 relative">
        <button
      type="button"
      onClick={onClose}
      className="absolute top-3 right-3 text-gray-500 hover:text-black text-xl"
    >
      ✕
    </button>
        <form className="space-y-4">
      {/* Bank */}
      <div>
        <label className="block font-medium mb-1">Bank</label>
        <select  className="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive" {...register("bank")} >
        <option value="">Select bank</option>
            <option>BOC</option>
            <option>Peoples</option>
            <option>HNB</option>
            <option>Commercial</option>
        </select>
        {errors.bank && <p className="text-red-500 text-sm">{errors.bank.message}</p>}
      </div>

      {/* Branch */}
      <div>
        <label className="block font-medium mb-1">Branch</label>
        <select  className="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive" {...register("branch")} >
        <option value="">Select Branch</option>
            <option>New Town</option>
            <option>Super Grade</option>   
        </select>
        {errors.branch && <p className="text-red-500 text-sm">{errors.branch.message}</p>}
      </div>

      {/* Account Number */}
      <div>
        <label className="block font-medium mb-1">Account Number</label>
        <Input type="text" placeholder="Enter Account Number" {...register("accountNumber")} />
        {errors.accountNumber && <p className="text-red-500 text-sm">{errors.accountNumber.message}</p>}
      </div>
      <div className="flex justify-center mt-4">
      <Button
        type="button"
        onClick={handleSubmit(onValid, onInvalid)}
        className="bg-[#953002] text-white hover:bg-[#672102]"
      >
        Save Bank Account
      </Button>
      </div>
    </form>
        </div>
        </div>
    </>
  );
});

export default AddBankDetails;