import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { Transaction } from "../types/finance";

// UI State Types
export interface FilterState {
	dateRange: {
		start: Date | null;
		end: Date | null;
	};
	categories: string[];
	types: ("income" | "expense" | "transfer")[];
	amountRange: {
		min: number | null;
		max: number | null;
	};
	searchQuery: string;
}

export interface ModalState {
	isTransactionModalOpen: boolean;
	isDeleteConfirmModalOpen: boolean;
	isSettingsModalOpen: boolean;
	isBulkEditModalOpen: boolean;
	selectedTransactionId: string | null;
	selectedTransactionIds: string[];
}

export interface LoadingState {
	isLoading: boolean;
	isExporting: boolean;
	isSyncing: boolean;
	isImporting: boolean;
	loadingMessage: string;
}

export interface NotificationState {
	notifications: Array<{
		id: string;
		type: "success" | "error" | "warning" | "info";
		title: string;
		message: string;
		timestamp: Date;
		isRead: boolean;
	}>;
}

export interface ViewState {
	currentView: "list" | "grid" | "chart";
	sortBy: "date" | "amount" | "category" | "description";
	sortOrder: "asc" | "desc";
	itemsPerPage: number;
	currentPage: number;
}

export interface UIState {
	filters: FilterState;
	modals: ModalState;
	loading: LoadingState;
	notifications: NotificationState;
	view: ViewState;
	sidebar: {
		isCollapsed: boolean;
		activeSection: string;
	};
	theme: {
		mode: "light" | "dark" | "system";
		primaryColor: string;
	};
}

export interface UIActions {
	// Filter actions
	setDateRange: (start: Date | null, end: Date | null) => void;
	setCategories: (categories: string[]) => void;
	setTypes: (types: ("income" | "expense" | "transfer")[]) => void;
	setAmountRange: (min: number | null, max: number | null) => void;
	setSearchQuery: (query: string) => void;
	clearFilters: () => void;
	resetFilters: () => void;

	// Modal actions
	openTransactionModal: (transactionId?: string) => void;
	closeTransactionModal: () => void;
	openDeleteConfirmModal: (transactionId: string) => void;
	closeDeleteConfirmModal: () => void;
	openSettingsModal: () => void;
	closeSettingsModal: () => void;
	openBulkEditModal: (transactionIds: string[]) => void;
	closeBulkEditModal: () => void;
	closeAllModals: () => void;

	// Loading actions
	setLoading: (isLoading: boolean, message?: string) => void;
	setExporting: (isExporting: boolean) => void;
	setSyncing: (isSyncing: boolean) => void;
	setImporting: (isImporting: boolean) => void;

	// Notification actions
	addNotification: (
		notification: Omit<
			UIState["notifications"]["notifications"][0],
			"id" | "timestamp" | "isRead"
		>,
	) => void;
	removeNotification: (id: string) => void;
	markNotificationAsRead: (id: string) => void;
	clearAllNotifications: () => void;

	// View actions
	setCurrentView: (view: "list" | "grid" | "chart") => void;
	setSortBy: (sortBy: "date" | "amount" | "category" | "description") => void;
	setSortOrder: (sortOrder: "asc" | "desc") => void;
	setItemsPerPage: (itemsPerPage: number) => void;
	setCurrentPage: (page: number) => void;

	// Sidebar actions
	toggleSidebar: () => void;
	setSidebarCollapsed: (collapsed: boolean) => void;
	setActiveSection: (section: string) => void;

	// Theme actions
	setThemeMode: (mode: "light" | "dark" | "system") => void;
	setPrimaryColor: (color: string) => void;

	// Utility actions
	getFilteredTransactions: (transactions: Transaction[]) => Transaction[];
	getSortedTransactions: (transactions: Transaction[]) => Transaction[];
	getPaginatedTransactions: (transactions: Transaction[]) => {
		transactions: Transaction[];
		totalPages: number;
		totalItems: number;
	};
}

type UIStore = UIState & UIActions;

// Default state
const defaultFilters: FilterState = {
	dateRange: {
		start: null,
		end: null,
	},
	categories: [],
	types: [],
	amountRange: {
		min: null,
		max: null,
	},
	searchQuery: "",
};

const defaultModals: ModalState = {
	isTransactionModalOpen: false,
	isDeleteConfirmModalOpen: false,
	isSettingsModalOpen: false,
	isBulkEditModalOpen: false,
	selectedTransactionId: null,
	selectedTransactionIds: [],
};

const defaultLoading: LoadingState = {
	isLoading: false,
	isExporting: false,
	isSyncing: false,
	isImporting: false,
	loadingMessage: "",
};

const defaultNotifications: NotificationState = {
	notifications: [],
};

const defaultView: ViewState = {
	currentView: "list",
	sortBy: "date",
	sortOrder: "desc",
	itemsPerPage: 25,
	currentPage: 1,
};

export const useUIStore = create<UIStore>()(
	devtools(
		(set, get) => ({
			// Initial state
			filters: defaultFilters,
			modals: defaultModals,
			loading: defaultLoading,
			notifications: defaultNotifications,
			view: defaultView,
			sidebar: {
				isCollapsed: false,
				activeSection: "dashboard",
			},
			theme: {
				mode: "system",
				primaryColor: "#3b82f6",
			},

			// Filter actions
			setDateRange: (start, end) => {
				set((state) => ({
					filters: {
						...state.filters,
						dateRange: { start, end },
					},
				}));
			},

			setCategories: (categories) => {
				set((state) => ({
					filters: {
						...state.filters,
						categories,
					},
				}));
			},

			setTypes: (types) => {
				set((state) => ({
					filters: {
						...state.filters,
						types,
					},
				}));
			},

			setAmountRange: (min, max) => {
				set((state) => ({
					filters: {
						...state.filters,
						amountRange: { min, max },
					},
				}));
			},

			setSearchQuery: (query) => {
				set((state) => ({
					filters: {
						...state.filters,
						searchQuery: query,
					},
				}));
			},

			clearFilters: () => {
				set({ filters: defaultFilters });
			},

			resetFilters: () => {
				set({ filters: defaultFilters });
			},

			// Modal actions
			openTransactionModal: (transactionId) => {
				set((state) => ({
					modals: {
						...state.modals,
						isTransactionModalOpen: true,
						selectedTransactionId: transactionId || null,
					},
				}));
			},

			closeTransactionModal: () => {
				set((state) => ({
					modals: {
						...state.modals,
						isTransactionModalOpen: false,
						selectedTransactionId: null,
					},
				}));
			},

			openDeleteConfirmModal: (transactionId) => {
				set((state) => ({
					modals: {
						...state.modals,
						isDeleteConfirmModalOpen: true,
						selectedTransactionId: transactionId,
					},
				}));
			},

			closeDeleteConfirmModal: () => {
				set((state) => ({
					modals: {
						...state.modals,
						isDeleteConfirmModalOpen: false,
						selectedTransactionId: null,
					},
				}));
			},

			openSettingsModal: () => {
				set((state) => ({
					modals: {
						...state.modals,
						isSettingsModalOpen: true,
					},
				}));
			},

			closeSettingsModal: () => {
				set((state) => ({
					modals: {
						...state.modals,
						isSettingsModalOpen: false,
					},
				}));
			},

			openBulkEditModal: (transactionIds) => {
				set((state) => ({
					modals: {
						...state.modals,
						isBulkEditModalOpen: true,
						selectedTransactionIds: transactionIds,
					},
				}));
			},

			closeBulkEditModal: () => {
				set((state) => ({
					modals: {
						...state.modals,
						isBulkEditModalOpen: false,
						selectedTransactionIds: [],
					},
				}));
			},

			closeAllModals: () => {
				set({ modals: defaultModals });
			},

			// Loading actions
			setLoading: (isLoading, message = "") => {
				set((state) => ({
					loading: {
						...state.loading,
						isLoading,
						loadingMessage: message,
					},
				}));
			},

			setExporting: (isExporting) => {
				set((state) => ({
					loading: {
						...state.loading,
						isExporting,
					},
				}));
			},

			setSyncing: (isSyncing) => {
				set((state) => ({
					loading: {
						...state.loading,
						isSyncing,
					},
				}));
			},

			setImporting: (isImporting) => {
				set((state) => ({
					loading: {
						...state.loading,
						isImporting,
					},
				}));
			},

			// Notification actions
			addNotification: (notification) => {
				const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
				set((state) => ({
					notifications: {
						notifications: [
							{
								...notification,
								id,
								timestamp: new Date(),
								isRead: false,
							},
							...state.notifications.notifications,
						],
					},
				}));
			},

			removeNotification: (id) => {
				set((state) => ({
					notifications: {
						notifications: state.notifications.notifications.filter(
							(n) => n.id !== id,
						),
					},
				}));
			},

			markNotificationAsRead: (id) => {
				set((state) => ({
					notifications: {
						notifications: state.notifications.notifications.map((n) =>
							n.id === id ? { ...n, isRead: true } : n,
						),
					},
				}));
			},

			clearAllNotifications: () => {
				set({ notifications: defaultNotifications });
			},

			// View actions
			setCurrentView: (view) => {
				set((state) => ({
					view: {
						...state.view,
						currentView: view,
					},
				}));
			},

			setSortBy: (sortBy) => {
				set((state) => ({
					view: {
						...state.view,
						sortBy,
					},
				}));
			},

			setSortOrder: (sortOrder) => {
				set((state) => ({
					view: {
						...state.view,
						sortOrder,
					},
				}));
			},

			setItemsPerPage: (itemsPerPage) => {
				set((state) => ({
					view: {
						...state.view,
						itemsPerPage,
						currentPage: 1, // Reset to first page when changing items per page
					},
				}));
			},

			setCurrentPage: (page) => {
				set((state) => ({
					view: {
						...state.view,
						currentPage: page,
					},
				}));
			},

			// Sidebar actions
			toggleSidebar: () => {
				set((state) => ({
					sidebar: {
						...state.sidebar,
						isCollapsed: !state.sidebar.isCollapsed,
					},
				}));
			},

			setSidebarCollapsed: (collapsed) => {
				set((state) => ({
					sidebar: {
						...state.sidebar,
						isCollapsed: collapsed,
					},
				}));
			},

			setActiveSection: (section) => {
				set((state) => ({
					sidebar: {
						...state.sidebar,
						activeSection: section,
					},
				}));
			},

			// Theme actions
			setThemeMode: (mode) => {
				set((state) => ({
					theme: {
						...state.theme,
						mode,
					},
				}));
			},

			setPrimaryColor: (color) => {
				set((state) => ({
					theme: {
						...state.theme,
						primaryColor: color,
					},
				}));
			},

			// Utility actions
			getFilteredTransactions: (transactions) => {
				const { filters } = get();

				return transactions.filter((transaction) => {
					// Date range filter
					if (
						filters.dateRange.start &&
						transaction.date < filters.dateRange.start
					) {
						return false;
					}
					if (
						filters.dateRange.end &&
						transaction.date > filters.dateRange.end
					) {
						return false;
					}

					// Category filter
					if (
						filters.categories.length > 0 &&
						!filters.categories.includes(transaction.category)
					) {
						return false;
					}

					// Type filter
					if (
						filters.types.length > 0 &&
						!filters.types.includes(transaction.type)
					) {
						return false;
					}

					// Amount range filter
					if (
						filters.amountRange.min !== null &&
						transaction.amount < filters.amountRange.min
					) {
						return false;
					}
					if (
						filters.amountRange.max !== null &&
						transaction.amount > filters.amountRange.max
					) {
						return false;
					}

					// Search query filter
					if (filters.searchQuery) {
						const query = filters.searchQuery.toLowerCase();
						const searchableText =
							`${transaction.description} ${transaction.category} ${transaction.note || ""}`.toLowerCase();
						if (!searchableText.includes(query)) {
							return false;
						}
					}

					return true;
				});
			},

			getSortedTransactions: (transactions) => {
				const { view } = get();

				return [...transactions].sort((a, b) => {
					let comparison = 0;

					switch (view.sortBy) {
						case "date":
							comparison = a.date.getTime() - b.date.getTime();
							break;
						case "amount":
							comparison = a.amount - b.amount;
							break;
						case "category":
							comparison = a.category.localeCompare(b.category);
							break;
						case "description":
							comparison = a.description.localeCompare(b.description);
							break;
					}

					return view.sortOrder === "asc" ? comparison : -comparison;
				});
			},

			getPaginatedTransactions: (transactions) => {
				const { view } = get();
				const startIndex = (view.currentPage - 1) * view.itemsPerPage;
				const endIndex = startIndex + view.itemsPerPage;

				return {
					transactions: transactions.slice(startIndex, endIndex),
					totalPages: Math.ceil(transactions.length / view.itemsPerPage),
					totalItems: transactions.length,
				};
			},
		}),
		{
			name: "ui-store",
		},
	),
);
