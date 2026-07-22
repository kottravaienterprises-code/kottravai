import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo, useRef } from 'react';
import { CartItem } from './CartContext';
import { useAuth } from './AuthContext';
import { supabase } from '@/utils/supabaseClient';
import axios from 'axios';

import { API_ENDPOINTS } from '@/config/api';

export interface Order {
    id: string;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    address?: string;
    city?: string;
    pincode?: string;
    items: CartItem[];
    total: number;
    status: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
    date: string;
    paymentId?: string;
    orderId?: string;
    shiprocketOrderId?: string;
    shipmentId?: string;
    zoneName?: string;
    subtotal_server?: number;
    shipping_server?: number;
    total_server?: number;
    total_gst_server?: number;
    has_customizations?: boolean;
}

interface OrderContextType {
    orders: Order[];
    adminOrders: Order[];
    addOrder: (order: Omit<Order, 'id' | 'date' | 'status'>) => Promise<void>;
    updateOrderStatus: (id: string, status: Order['status']) => Promise<void>;
    deleteOrder: (id: string) => Promise<void>;
    refreshOrders: () => Promise<void>;
    fetchAllOrders: (force?: boolean) => Promise<void>;
    loading: boolean;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider = ({ children }: { children: ReactNode }) => {
    const { user, isAuthenticated } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [adminOrders, setAdminOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(false);
    const hasFetchedOrders = useRef(false);
    const hasFetchedAdminOrders = useRef(false);

    const fetchOrders = useCallback(async () => {
        if (!user?.email || hasFetchedOrders.current) return;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            const response = await axios.get(API_ENDPOINTS.orders, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (Array.isArray(response.data)) {
                setOrders(response.data);
            } else {
                setOrders([]);
            }
            hasFetchedOrders.current = true;
        } catch (error) {
            console.error("Failed to fetch user orders", error);
        }
    }, [user?.email]);

    const lastAdminFetchRef = useRef<number>(0);
    const fetchAllOrders = useCallback(async (force = false) => {
        const recentlyFetched = Date.now() - lastAdminFetchRef.current < 30000;
        if (!force && hasFetchedAdminOrders.current) return;
        if (force && recentlyFetched) {
            console.log('🛡️ Throttling admin orders fetch');
            return;
        }

        lastAdminFetchRef.current = Date.now();

        try {
            // Priority: Session Storage (User's active login token) -> Env Var -> Default Fallback
            const adminPass = sessionStorage.getItem('kottravai_admin_token') || 
                            import.meta.env.VITE_ADMIN_PASSWORD || '';
                            
            const response = await axios.get(API_ENDPOINTS.orders, {
                headers: { 'X-Admin-Secret': adminPass }
            });
            
            if (Array.isArray(response.data)) {
                setAdminOrders(response.data);
            } else {
                console.error("Expected array for admin orders but got:", response.data);
                setAdminOrders([]);
            }
            hasFetchedAdminOrders.current = true;
        } catch (error) {
            console.error("Failed to fetch all orders for admin", error);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated && user?.email) {
            setLoading(true);

            // Only fetch what's needed for the current user
            if (!hasFetchedOrders.current) {
                fetchOrders().finally(() => {
                    setLoading(false);
                    hasFetchedOrders.current = true;
                });
            }

            // Polling for live updates only if authenticated
            const interval = setInterval(() => {
                fetchOrders();
            }, 60000); // Increased interval to 1 minute
            return () => clearInterval(interval);
        } else {
            setOrders([]);
            // Only clear admin orders if we're not even in admin mode
            if (sessionStorage.getItem('kottravai_admin_session') !== 'true') {
                setAdminOrders([]);
            }
        }
    }, [isAuthenticated, user?.email]);

    const addOrder = async (orderData: Omit<Order, 'id' | 'date' | 'status'>) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            const response = await axios.post(API_ENDPOINTS.orders, orderData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOrders(prev => [response.data, ...prev]);
            fetchAllOrders(true); // Sync admin view
        } catch (error) {
            console.error("Failed to add order", error);
            throw error;
        }
    };

    const updateOrderStatus = async (id: string, status: Order['status']) => {
        try {
            const adminPass = sessionStorage.getItem('kottravai_admin_token') || 
                            import.meta.env.VITE_ADMIN_PASSWORD || '';
                            
            await axios.put(`${API_ENDPOINTS.orders}/${id}`, { status }, {
                headers: { 'X-Admin-Secret': adminPass }
            });
            setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
            setAdminOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
        } catch (error) {
            console.error("Failed to update order status", error);
            throw error;
        }
    };

    const deleteOrder = async (id: string) => {
        try {
            const adminPass = sessionStorage.getItem('kottravai_admin_token') || 
                            import.meta.env.VITE_ADMIN_PASSWORD || '';
                            
            await axios.delete(`${API_ENDPOINTS.orders}/${id}`, {
                headers: { 'X-Admin-Secret': adminPass }
            });
            setOrders(prev => prev.filter(o => o.id !== id));
            setAdminOrders(prev => prev.filter(o => o.id !== id));
        } catch (error) {
            console.error("Failed to delete order", error);
            throw error;
        }
    };

    const contextValue = useMemo(() => ({
        orders,
        adminOrders,
        addOrder,
        updateOrderStatus,
        deleteOrder,
        refreshOrders: fetchOrders,
        fetchAllOrders,
        loading
    }), [orders, adminOrders, fetchOrders, fetchAllOrders, loading]);

    return (
        <OrderContext.Provider value={contextValue}>
            {children}
        </OrderContext.Provider>
    );
};

export const useOrders = () => {
    const context = useContext(OrderContext);
    if (!context) {
        throw new Error('useOrders must be used within a OrderProvider');
    }
    return context;
};

