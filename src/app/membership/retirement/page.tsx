"use client";
import { useRef, useState } from "react";
import { Button } from "../../../components/ui/button";
import RetirementForm, {RetirementFormRef,} from "../../../components/ui/retirement/retirementform";
import DocumentUpload from "../../../components/ui/grade5schoolarship/documentupload";
import { MarkIncompleteModal } from "../../../components/ui/grade5schoolarship/MarkIncomplete";
import AddBankDetails, { AddBankDetailsRef } from "../../../components/ui/retirement/addbankdetails";


export default function RetirementPage() {
  const formRef = useRef<RetirementFormRef>(null);
  const bankFormRef = useRef<AddBankDetailsRef>(null);

  const [openModal, setOpenModal] = useState(false);
  const [openBankModal, setOpenBankModal] = useState(false);
 
  const [banks, setBanks] = useState<string[]>([]);
  const [branches, setBranches] = useState<Record<string, string[]>>({});

  const handleConfirm = (reason: string) => {
    if (!reason.trim()) return;

    
    setOpenModal(false);

    console.log("Marked as Incomplete:", reason);
  };

  const handleSave = () => {
    formRef.current?.submitForm();
  };

  const handleSubmitForm = () => {
    formRef.current?.submitForm();
  };

  const handleBankSave = () => {
    bankFormRef.current?.submitBankForm();
    setOpenBankModal(false);
  };

  return (
    <>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 p-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <p className="text-2xl font-bold text-[#953002]">
              Retirement Request
            </p>

            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                className="bg-white text-black hover:bg-gray-100"
              >
                Save
              </Button>

              <Button
                onClick={() => setOpenModal(true)}
                className="bg-[#D4183D] text-white hover:bg-[#b31533]"
              >
                Mark Incomplete
              </Button>

              <Button
                onClick={handleSubmitForm}
                className="bg-[#953002] text-white hover:bg-[#672102]"
              >
                Submit
              </Button>
            </div>
          </div>

          <div className="flex gap-6 mt-6">
            <div className="flex-1 flex flex-col gap-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <RetirementForm ref={formRef} />
              </div>

              <div className="bg-white rounded-lg shadow-sm p-4"> 
                <div className="flex items-center justify-between mb-2"> 
                  <p className="text-xl font-bold text-[#953002]"> Minor Saving Disbursement </p> 
                  <Button
                    className="bg-gray-50 text-black hover:bg-gray-100"
                    onClick={() => setOpenBankModal(true)}
                  >
                    +Account
                  </Button>
                </div>
                <p className="text-1/2xl flex gap-2">Enter disbursement details for any saving accounts</p>
                <br/>
                <p className="text-1/2xl ">No minor saving account added</p>
              </div> 
            </div>

            <div className="w-1/4">
              <DocumentUpload />
            </div>
          </div>
        </div>
      </div>

      <MarkIncompleteModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        onConfirm={handleConfirm}
      />
      {openBankModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50">
          <div className="bg-white p-6 rounded shadow-lg w-96">
            <h2 className="text-xl font-bold text-[#953002] mb-4">Add Bank Account</h2>
            <AddBankDetails ref={bankFormRef} onSave={handleBankSave} onClose={() => setOpenBankModal(false)} />
            <Button type="button" onClick={() => setOpenBankModal(false)} className="mt-4 bg-gray-200 text-black hover:bg-gray-300">Cancel</Button>
          </div>
        </div>
      )}
    </>
  );
}