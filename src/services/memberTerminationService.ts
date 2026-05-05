const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

export interface MemberTerminationData {
  id?: number;
  terminationId?: string;
  memberId: number;
  memberName?: string;
  memberId_Code?: string;
  terminationReason: string;
  terminationStatus?: string;
  terminationDate: string;
  requestedDate: string;
  approvedDate?: string;
  processedDate?: string;
  remarks?: string;
  approvedBy?: string;
  processedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const memberTerminationService = {
  /**
   * Create a new termination request
   */
  async createTermination(
    termination: MemberTerminationData
  ): Promise<MemberTerminationData> {
    try {
      const response = await fetch(`${API_BASE_URL}/terminations/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(termination),
      });

      if (!response.ok) {
        throw new Error(`Failed to create termination: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error creating termination:", error);
      throw error;
    }
  },

  /**
   * Get termination by ID
   */
  async getTerminationById(id: number): Promise<MemberTerminationData> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/terminations/getTerminationById/${id}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch termination: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching termination by ID:", error);
      throw error;
    }
  },

  /**
   * Get termination by Termination ID (string)
   */
  async getTerminationByTerminationId(
    terminationId: string
  ): Promise<MemberTerminationData> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/terminations/getTerminationByTerminationId/${encodeURIComponent(
          terminationId
        )}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch termination: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching termination by termination ID:", error);
      throw error;
    }
  },

  /**
   * Get all terminations for a member
   */
  async getTerminationsByMemberId(
    memberId: number
  ): Promise<MemberTerminationData[]> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/terminations/getTerminationsByMemberId/${memberId}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch terminations: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching terminations by member ID:", error);
      throw error;
    }
  },

  /**
   * Get all pending terminations
   */
  async getPendingTerminations(): Promise<MemberTerminationData[]> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/terminations/getPendingTerminations`
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch pending terminations: ${response.statusText}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching pending terminations:", error);
      throw error;
    }
  },

  /**
   * Get terminations by status
   */
  async getTerminationsByStatus(
    status: string
  ): Promise<MemberTerminationData[]> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/terminations/getTerminationsByStatus/${status}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch terminations: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching terminations by status:", error);
      throw error;
    }
  },

  /**
   * Get all terminations
   */
  async getAllTerminations(): Promise<MemberTerminationData[]> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/terminations/getAllTerminations`
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch all terminations: ${response.statusText}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching all terminations:", error);
      throw error;
    }
  },

  /**
   * Approve a termination
   */
  async approveTermination(
    id: number,
    approvedBy: string
  ): Promise<MemberTerminationData> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/terminations/approveTermination/${id}?approvedBy=${encodeURIComponent(
          approvedBy
        )}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to approve termination: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error approving termination:", error);
      throw error;
    }
  },

  /**
   * Reject a termination
   */
  async rejectTermination(
    id: number,
    remarks: string
  ): Promise<MemberTerminationData> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/terminations/rejectTermination/${id}?remarks=${encodeURIComponent(
          remarks
        )}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to reject termination: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error rejecting termination:", error);
      throw error;
    }
  },

  /**
   * Process a termination (finalize it)
   */
  async processTermination(
    id: number,
    processedBy: string
  ): Promise<MemberTerminationData> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/terminations/processTermination/${id}?processedBy=${encodeURIComponent(
          processedBy
        )}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to process termination: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error processing termination:", error);
      throw error;
    }
  },

  /**
   * Update a termination
   */
  async updateTermination(
    id: number,
    termination: Partial<MemberTerminationData>
  ): Promise<MemberTerminationData> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/terminations/updateTermination/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(termination),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to update termination: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error updating termination:", error);
      throw error;
    }
  },

  /**
   * Delete a termination
   */
  async deleteTermination(id: number): Promise<string> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/terminations/deleteTermination/${id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to delete termination: ${response.statusText}`);
      }

      const data = await response.text();
      return data;
    } catch (error) {
      console.error("Error deleting termination:", error);
      throw error;
    }
  },
};
