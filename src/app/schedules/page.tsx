"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navigation from "../../components/Navigation";
import DeleteConfirmModal from "../../components/DeleteConfirmModal";


interface Schedule {
  id: string;
  title: string;
  description?: string;
  type:
    | "BREW_SESSION"
    | "MAINTENANCE"
    | "CLEANING"
    | "DELIVERY"
    | "MEETING"
    | "OTHER";
  startDate: string;
  endDate?: string;
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "POSTPONED";
  isRecurring: boolean;
  recurrenceRule?: string;
  createdAt: string;
  updatedAt: string;
}

export default function SchedulesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSchedules, setTotalSchedules] = useState(0);
  const [itemsPerPage] = useState(10);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "BREW_SESSION" as Schedule["type"],
    startDate: "",
    endDate: "",
    isRecurring: false,
    recurrenceRule: "",
  });

  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    scheduleId: "",
    scheduleName: "",
    isDeleting: false,
  });

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, filterType, filterStatus]);

  // Initial load
  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/auth/signin");
      return;
    }
    fetchSchedules();
  }, [session, status, router]);

  // Fetch when filters/search/page changes (without loading state for search)
  useEffect(() => {
    if (status === "loading" || !session) return;
    const isSearchChange = debouncedSearchQuery !== "";
    fetchSchedules(!isSearchChange);
  }, [filterType, filterStatus, debouncedSearchQuery, currentPage]);

  const fetchSchedules = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const params = new URLSearchParams();
      if (filterType) params.append("type", filterType);
      if (filterStatus) params.append("status", filterStatus);
      if (debouncedSearchQuery) params.append("search", debouncedSearchQuery);
      params.append("page", currentPage.toString());
      params.append("limit", itemsPerPage.toString());

      const response = await fetch(`/api/schedules?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch schedules");
      }
      const data = await response.json();
      setSchedules(data.schedules || []);
      setTotalPages(data.pagination?.pages || 1);
      setTotalSchedules(data.pagination?.total || 0);
    } catch (error) {
      console.error("Error fetching schedules:", error);
      setError("Failed to load schedules");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingSchedule
        ? `/api/schedules/${editingSchedule.id}`
        : "/api/schedules";
      const method = editingSchedule ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save schedule");
      }

      await fetchSchedules();
      setShowAddForm(false);
      setEditingSchedule(null);
      resetForm();
      setError("");
      setSuccess(
        editingSchedule
          ? "Schedule updated successfully!"
          : "Schedule added successfully!"
      );
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error("Error saving schedule:", error);
      setError(
        error instanceof Error ? error.message : "Failed to save schedule"
      );
    }
  };

  // Helper function to convert date to local datetime-local format
  const formatDateForInput = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleEdit = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      title: schedule.title,
      description: schedule.description || "",
      type: schedule.type,
      startDate: formatDateForInput(schedule.startDate),
      endDate: schedule.endDate
        ? formatDateForInput(schedule.endDate)
        : "",
      isRecurring: schedule.isRecurring,
      recurrenceRule: schedule.recurrenceRule || "",
    });
    setShowAddForm(true);
  };

  const handleStatusUpdate = async (
    scheduleId: string,
    newStatus: Schedule["status"]
  ) => {
    try {
      const response = await fetch(`/api/schedules/${scheduleId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update schedule status");
      }

      await fetchSchedules();

      // Show success message based on status
      const statusMessages = {
        CANCELLED: "Schedule cancelled successfully!",
        POSTPONED: "Schedule postponed successfully!",
        SCHEDULED: "Schedule rescheduled successfully!",
        IN_PROGRESS: "Schedule started successfully!",
        COMPLETED: "Schedule completed successfully!",
      };

      setSuccess(
        statusMessages[newStatus] || "Schedule status updated successfully!"
      );
      setTimeout(() => setSuccess(""), 3000);
      setError("");
    } catch (error) {
      console.error("Error updating schedule status:", error);
      setError("Failed to update schedule status");
    }
  };

  const handleDelete = (schedule: Schedule) => {
    setDeleteModal({
      isOpen: true,
      scheduleId: schedule.id,
      scheduleName: schedule.title,
      isDeleting: false,
    });
  };

  const confirmDelete = async () => {
    setDeleteModal((prev) => ({ ...prev, isDeleting: true }));

    try {
      const response = await fetch(`/api/schedules/${deleteModal.scheduleId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete schedule");
      }

      await fetchSchedules();
      setSuccess("Schedule deleted successfully!");
      setTimeout(() => setSuccess(""), 3000);
      setError("");
    } catch (error) {
      console.error("Error deleting schedule:", error);
      setError(
        error instanceof Error ? error.message : "Failed to delete schedule"
      );
    } finally {
      setDeleteModal({
        isOpen: false,
        scheduleId: "",
        scheduleName: "",
        isDeleting: false,
      });
    }
  };

  const closeDeleteModal = () => {
    if (!deleteModal.isDeleting) {
      setDeleteModal({
        isOpen: false,
        scheduleId: "",
        scheduleName: "",
        isDeleting: false,
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      type: "BREW_SESSION",
      startDate: "",
      endDate: "",
      isRecurring: false,
      recurrenceRule: "",
    });
  };

  const getTypeIcon = (type: Schedule["type"]) => {
    switch (type) {
      case "BREW_SESSION":
        return "☕";
      case "MAINTENANCE":
        return "🔧";
      case "CLEANING":
        return "🧽";
      case "DELIVERY":
        return "🚚";
      case "MEETING":
        return "👥";
      default:
        return "📅";
    }
  };

  const getStatusColor = (status: Schedule["status"]) => {
    switch (status) {
      case "SCHEDULED":
        return "bg-blue-100 text-blue-800";
      case "IN_PROGRESS":
        return "bg-yellow-100 text-yellow-800";
      case "COMPLETED":
        return "bg-green-100 text-green-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      case "POSTPONED":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading schedules...</p>
        </div>
      </div>
    );
  }

  return (
      <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Schedules & Calendar
          </h1>
          <p className="mt-2 text-gray-600">
            Manage brewing sessions, maintenance, and other scheduled activities
          </p>
        </div>

        {/* Filters and Actions */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search schedules..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                    }
                  }}
                  className="px-4 py-2 pl-10 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500 w-full sm:w-64"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </div>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500 cursor-pointer"
              >
                <option value="">All Types</option>
                <option value="BREW_SESSION">Brew Sessions</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="CLEANING">Cleaning</option>
                <option value="DELIVERY">Delivery</option>
                <option value="MEETING">Meeting</option>
                <option value="OTHER">Other</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500 cursor-pointer"
              >
                <option value="">All Statuses</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="POSTPONED">Postponed</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() =>
                  setViewMode(viewMode === "list" ? "calendar" : "list")
                }
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 cursor-pointer"
              >
                {viewMode === "list" ? "📅 Calendar" : "📋 List"}
              </button>

              <button
                onClick={() => {
                  setShowAddForm(true);
                  setEditingSchedule(null);
                  resetForm();
                }}
                className="bg-amber-600 text-white px-4 py-2 rounded-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
              >
                Add Schedule
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
            {success}
          </div>
        )}

        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingSchedule ? "Edit Schedule" : "Add New Schedule"}
            </h2>
            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type *
                </label>
                <select
                  required
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value as Schedule["type"],
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500 cursor-pointer"
                >
                  <option value="BREW_SESSION">Brew Session</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="CLEANING">Cleaning</option>
                  <option value="DELIVERY">Delivery</option>
                  <option value="MEETING">Meeting</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date & Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData({ ...formData, endDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500 cursor-pointer"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length <= 191) {
                      setFormData({ ...formData, description: value });
                    }
                  }}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-amber-500 focus:border-amber-500 ${
                    formData.description.length > 180
                      ? "border-yellow-400"
                      : "border-gray-300"
                  }`}
                  placeholder="Enter schedule description (max 191 characters)"
                />
                <div className="flex justify-between items-center mt-1">
                  <span
                    className={`text-xs ${
                      formData.description.length > 180
                        ? formData.description.length >= 191
                          ? "text-red-500"
                          : "text-yellow-500"
                        : "text-gray-500"
                    }`}
                  >
                    {formData.description.length}/191 characters
                  </span>
                  {formData.description.length > 180 && (
                    <span
                      className={`text-xs ${
                        formData.description.length >= 191
                          ? "text-red-500"
                          : "text-yellow-500"
                      }`}
                    >
                      {formData.description.length >= 191
                        ? "Character limit reached"
                        : `${
                            191 - formData.description.length
                          } characters remaining`}
                    </span>
                  )}
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isRecurring"
                    checked={formData.isRecurring}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        isRecurring: e.target.checked,
                      })
                    }
                    className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded cursor-pointer"
                  />
                  <label
                    htmlFor="isRecurring"
                    className="ml-2 block text-sm text-gray-900"
                  >
                    Make this a repeating schedule
                  </label>
                  <div className="relative ml-2 group">
                    <svg
                      className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none w-64 z-10">
                      <div className="text-center">
                        <strong>Recurring Schedule Rules:</strong>
                        <br />
                        • Daily: "FREQ=DAILY;INTERVAL=1"
                        <br />
                        • Weekly: "FREQ=WEEKLY;INTERVAL=1"
                        <br />
                        • Monthly: "FREQ=MONTHLY;INTERVAL=1"
                        <br />
                        • Every 2 weeks: "FREQ=WEEKLY;INTERVAL=2"
                        <br />• Weekdays only:
                        "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR"
                      </div>
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                    </div>
                  </div>
                </div>
              </div>

              {formData.isRecurring && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Repeat Pattern *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.recurrenceRule}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        recurrenceRule: e.target.value,
                      })
                    }
                    placeholder="Enter recurrence rule (e.g., FREQ=WEEKLY;INTERVAL=1 for weekly)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Use RFC 5545 format. Check the ℹ️ icon next to "Make this a
                    repeating schedule" above for examples.
                  </p>
                </div>
              )}

              <div className="md:col-span-2 flex gap-4">
                <button
                  type="submit"
                  className="bg-amber-600 text-white px-4 py-2 rounded-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                >
                  {editingSchedule ? "Update" : "Add"} Schedule
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingSchedule(null);
                    resetForm();
                  }}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Schedules List */}
        {viewMode === "list" && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">
                Scheduled Activities
              </h2>
              <p className="text-sm text-gray-500">
                Showing {schedules.length} of {totalSchedules} schedules
              </p>
            </div>

            {schedules.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto h-12 w-12 text-gray-400">📅</div>
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No schedules
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by adding your first scheduled activity.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {schedules.map((schedule) => (
                  <div key={schedule.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="text-2xl">
                          {getTypeIcon(schedule.type)}
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            {schedule.title}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {schedule.type.replace("_", " ").toLowerCase()}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {formatDate(schedule.startDate)}
                            {schedule.endDate &&
                              ` - ${formatDate(schedule.endDate)}`}
                          </p>
                          {schedule.description && (
                            <p className="text-sm text-gray-600 mt-2">
                              {schedule.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                            schedule.status
                          )}`}
                        >
                          {schedule.status.replace("_", " ")}
                        </span>

                        <div className="flex space-x-2">
                          {schedule.status === "SCHEDULED" && (
                            <>
                              <button
                                onClick={() =>
                                  handleStatusUpdate(schedule.id, "IN_PROGRESS")
                                }
                                className="text-blue-600 hover:text-blue-900 text-sm cursor-pointer"
                              >
                                Start
                              </button>
                              <button
                                onClick={() =>
                                  handleStatusUpdate(schedule.id, "CANCELLED")
                                }
                                className="text-red-600 hover:text-red-900 text-sm cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() =>
                                  handleStatusUpdate(schedule.id, "POSTPONED")
                                }
                                className="text-orange-600 hover:text-orange-900 text-sm cursor-pointer"
                              >
                                Postpone
                              </button>
                            </>
                          )}

                          {schedule.status === "IN_PROGRESS" && (
                            <>
                              <button
                                onClick={() =>
                                  handleStatusUpdate(schedule.id, "COMPLETED")
                                }
                                className="text-green-600 hover:text-green-900 text-sm cursor-pointer"
                              >
                                Complete
                              </button>
                              <button
                                onClick={() =>
                                  handleStatusUpdate(schedule.id, "CANCELLED")
                                }
                                className="text-red-600 hover:text-red-900 text-sm cursor-pointer"
                              >
                                Cancel
                              </button>
                            </>
                          )}

                          {(schedule.status === "POSTPONED" ||
                            schedule.status === "CANCELLED") && (
                            <button
                              onClick={() =>
                                handleStatusUpdate(schedule.id, "SCHEDULED")
                              }
                              className="text-blue-600 hover:text-blue-900 text-sm cursor-pointer"
                            >
                              Reschedule
                            </button>
                          )}

                          <button
                            onClick={() => handleEdit(schedule)}
                            className="text-amber-600 hover:text-amber-900 text-sm cursor-pointer"
                          >
                            Edit
                          </button>

                          {schedule.status !== "COMPLETED" && (
                            <button
                              onClick={() => handleDelete(schedule)}
                              className="text-red-600 hover:text-red-900 text-sm cursor-pointer"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() =>
                        setCurrentPage(Math.max(1, currentPage - 1))
                      }
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                    >
                      Previous
                    </button>

                    <div className="flex space-x-1">
                      {(() => {
                        const pages = [];

                        if (totalPages <= 7) {
                          // Show all pages if 7 or fewer
                          for (let i = 1; i <= totalPages; i++) {
                            pages.push(
                              <button
                                key={i}
                                onClick={() => setCurrentPage(i)}
                                className={`px-3 py-1 text-sm border rounded-md cursor-pointer ${
                                  currentPage === i
                                    ? "bg-amber-600 text-white border-amber-600"
                                    : "border-gray-300 hover:bg-gray-50"
                                }`}
                              >
                                {i}
                              </button>
                            );
                          }
                        } else {
                          // Always show first page
                          pages.push(
                            <button
                              key={1}
                              onClick={() => setCurrentPage(1)}
                              className={`px-3 py-1 text-sm border rounded-md cursor-pointer ${
                                currentPage === 1
                                  ? "bg-amber-600 text-white border-amber-600"
                                  : "border-gray-300 hover:bg-gray-50"
                              }`}
                            >
                              1
                            </button>
                          );

                          // Add ellipsis if needed
                          if (currentPage > 4) {
                            pages.push(
                              <span
                                key="ellipsis1"
                                className="px-2 py-1 text-sm text-gray-500"
                              >
                                ...
                              </span>
                            );
                          }

                          // Show pages around current page
                          const start = Math.max(2, currentPage - 1);
                          const end = Math.min(totalPages - 1, currentPage + 1);

                          for (let i = start; i <= end; i++) {
                            if (i !== 1 && i !== totalPages) {
                              pages.push(
                                <button
                                  key={i}
                                  onClick={() => setCurrentPage(i)}
                                  className={`px-3 py-1 text-sm border rounded-md cursor-pointer ${
                                    currentPage === i
                                      ? "bg-amber-600 text-white border-amber-600"
                                      : "border-gray-300 hover:bg-gray-50"
                                  }`}
                                >
                                  {i}
                                </button>
                              );
                            }
                          }

                          // Add ellipsis if needed
                          if (currentPage < totalPages - 3) {
                            pages.push(
                              <span
                                key="ellipsis2"
                                className="px-2 py-1 text-sm text-gray-500"
                              >
                                ...
                              </span>
                            );
                          }

                          // Always show last page
                          if (totalPages > 1) {
                            pages.push(
                              <button
                                key={totalPages}
                                onClick={() => setCurrentPage(totalPages)}
                                className={`px-3 py-1 text-sm border rounded-md cursor-pointer ${
                                  currentPage === totalPages
                                    ? "bg-amber-600 text-white border-amber-600"
                                    : "border-gray-300 hover:bg-gray-50"
                                }`}
                              >
                                {totalPages}
                              </button>
                            );
                          }
                        }

                        return pages;
                      })()}
                    </div>

                    <button
                      onClick={() =>
                        setCurrentPage(Math.min(totalPages, currentPage + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                    >
                      Next
                    </button>
                  </div>

                  <div className="text-sm text-gray-500">
                    Page {currentPage} of {totalPages}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Calendar View Placeholder */}
        {viewMode === "calendar" && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 text-gray-400">📅</div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                Calendar View
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Calendar view coming soon. Use list view for now.
              </p>
              <button
                onClick={() => setViewMode("list")}
                className="mt-4 bg-amber-600 text-white px-4 py-2 rounded-md hover:bg-amber-700 cursor-pointer"
              >
                Switch to List View
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
        title="Delete Schedule"
        message="Are you sure you want to delete this schedule?"
        itemName={deleteModal.scheduleName}
        isDeleting={deleteModal.isDeleting}
      />
      </div>
  );
}
