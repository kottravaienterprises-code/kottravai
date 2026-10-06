import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  X,
  Plus,
  Trash2,
  FileText,
  CheckCircle,
  AlertCircle,
  Building,
  User,
  DollarSign,
  Sparkles,
  Search
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  gst_rate?: number;
  category?: string;
  categorySlug?: string;
  sku?: string;
  image?: string;
  variants?: any[];
}

interface CreateOfflineInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  apiBase: string;
  adminToken: string;
  onInvoiceCreated: (order: any) => void;
  onGenerateInvoicePdf?: (order: any) => void;
}

const INDIAN_STATES = [
  "Tamil Nadu",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry"
];

export const CreateOfflineInvoiceModal: React.FC<CreateOfflineInvoiceModalProps> = ({
  isOpen,
  onClose,
  products,
  apiBase,
  adminToken,
  onInvoiceCreated,
  onGenerateInvoicePdf
}) => {
  if (!isOpen) return null;

  // Form State
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerCompany, setCustomerCompany] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [placeOfSupply, setPlaceOfSupply] = useState("Tamil Nadu");
  const [pincode, setPincode] = useState("");
  const [customerGstin, setCustomerGstin] = useState("");

  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedQty, setSelectedQty] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [productSearch, setProductSearch] = useState("");
  const [productCategory, setProductCategory] = useState("");

  const [lineItems, setLineItems] = useState<any[]>([]);

  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [shippingFee, setShippingFee] = useState<number>(0);
  const [shippingTaxRate, _setShippingTaxRate] = useState<number>(0);

  const [paymentStatus, setPaymentStatus] = useState<"paid" | "pending">("paid");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [notes, _setNotes] = useState("");

  // Preview & Async state
  const [preview, setPreview] = useState<any>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const getProductCategory = (product: Product) =>
    product.category?.trim() ||
    product.categorySlug?.replace(/-/g, " ") ||
    "Uncategorized";
  const categories = Array.from(
    new Set(products.map(getProductCategory))
  ).sort((a, b) => a.localeCompare(b));
  const searchTerm = productSearch.trim().toLocaleLowerCase();
  const filteredProducts = products.filter((product) => {
    const category = getProductCategory(product);
    const matchesCategory = !productCategory || category === productCategory;
    const matchesSearch =
      !searchTerm ||
      [product.name, product.sku, category]
        .some((value) => value?.toLocaleLowerCase().includes(searchTerm));
    return matchesCategory && matchesSearch;
  });
  const groupedProducts = filteredProducts.reduce<Record<string, Product[]>>(
    (groups, product) => {
      const category = getProductCategory(product);
      (groups[category] ||= []).push(product);
      return groups;
    },
    {}
  );

  // Initialize Idempotency Key on open
  useEffect(() => {
    const key = `off-inv-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 9)}`;
    setIdempotencyKey(key);
    setCreatedOrder(null);
    setErrorMessage("");
  }, [isOpen]);

  // Sync amountPaid with grandTotal if paymentStatus is 'paid'
  useEffect(() => {
    if (paymentStatus === "paid" && preview?.grandTotal) {
      setAmountPaid(preview.grandTotal);
    }
  }, [paymentStatus, preview?.grandTotal]);

  // Handle live preview calculation
  useEffect(() => {
    if (lineItems.length === 0) {
      setPreview(null);
      return;
    }

    const fetchPreview = async () => {
      setIsPreviewLoading(true);
      setErrorMessage("");
      try {
        const payload = {
          placeOfSupply,
          items: lineItems.map((item) => ({
            id: item.id,
            quantity: item.quantity,
            selectedVariant: item.selectedVariant || null
          })),
          discountAmount: Number(discountAmount || 0),
          shippingFee: Number(shippingFee || 0),
          shippingTaxRate: Number(shippingTaxRate || 0)
        };

        const res = await axios.post(
          `${apiBase}/api/admin/invoices/offline/preview`,
          payload,
          {
            headers: {
              "x-admin-secret": adminToken,
              "Content-Type": "application/json"
            }
          }
        );
        setPreview(res.data);
      } catch (err: any) {
        console.error("Preview Calc Error:", err);
        setErrorMessage(
          err.response?.data?.error || "Failed to calculate live price preview"
        );
      } finally {
        setIsPreviewLoading(false);
      }
    };

    const timer = setTimeout(fetchPreview, 300);
    return () => clearTimeout(timer);
  }, [
    lineItems,
    placeOfSupply,
    discountAmount,
    shippingFee,
    shippingTaxRate,
    apiBase,
    adminToken
  ]);

  // Add Item to Line Items List
  const handleAddItem = () => {
    if (!selectedProductId) return;
    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;

    let itemPrice = Number(prod.price);
    if (selectedVariant) {
      itemPrice = Number(selectedVariant.price);
    }

    const newItem = {
      id: prod.id,
      name: prod.name,
      price: itemPrice,
      quantity: Number(selectedQty) || 1,
      selectedVariant,
      gst_rate: prod.gst_rate || 0
    };

    setLineItems((prev) => {
      const existingIdx = prev.findIndex(
        (i) =>
          i.id === newItem.id &&
          i.selectedVariant?.weight === newItem.selectedVariant?.weight
      );
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx].quantity += newItem.quantity;
        return updated;
      }
      return [...prev, newItem];
    });

    setSelectedProductId("");
    setSelectedQty(1);
    setSelectedVariant(null);
  };

  // Remove Item
  const handleRemoveItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Update Item Quantity
  const handleUpdateQty = (index: number, newQty: number) => {
    if (newQty <= 0) return;
    setLineItems((prev) => {
      const updated = [...prev];
      updated[index].quantity = newQty;
      return updated;
    });
  };

  // Submit Invoice
  const handleSubmitInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      alert("Customer Name is required");
      return;
    }
    if (lineItems.length === 0) {
      alert("Please add at least one product to the invoice");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const payload = {
        idempotencyKey,
        customer: {
          name: customerName.trim(),
          company: customerCompany.trim() || undefined,
          email: customerEmail.trim() || undefined,
          phone: customerPhone.trim() || undefined,
          address: address.trim() || undefined,
          city: city.trim() || undefined,
          state: placeOfSupply,
          pincode: pincode.trim() || undefined,
          gstin: customerGstin.trim() || undefined
        },
        placeOfSupply,
        items: lineItems.map((item) => ({
          id: item.id,
          quantity: item.quantity,
          selectedVariant: item.selectedVariant || null
        })),
        discountAmount: Number(discountAmount || 0),
        shippingFee: Number(shippingFee || 0),
        shippingTaxRate: Number(shippingTaxRate || 0),
        paymentStatus,
        paymentMethod,
        paymentReference: paymentReference.trim() || null,
        amountPaid: Number(amountPaid || 0),
        notes: notes.trim() || null,
        invoiceDate
      };

      const res = await axios.post(
        `${apiBase}/api/admin/invoices/offline`,
        payload,
        {
          headers: {
            "x-admin-secret": adminToken,
            "Content-Type": "application/json"
          }
        }
      );

      if (res.data && res.data.order) {
        const newOrder = res.data.order;
        setCreatedOrder(newOrder);
        onInvoiceCreated(newOrder);
      }
    } catch (err: any) {
      console.error("Create Offline Invoice Failure:", err);
      setErrorMessage(
        err.response?.data?.error ||
          err.message ||
          "Failed to create offline invoice"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-purple-100 flex flex-col">
        {/* Modal Header */}
        <div className="bg-[#2D1B4E] text-white p-6 rounded-t-2xl flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#8E2A8B] rounded-xl text-white">
              <FileText size={22} />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-wide">
                Create Offline Invoice
              </h3>
              <p className="text-xs text-purple-200">
                Server-backed pricing foundation with GST & Idempotency
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-purple-200 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 flex-1">
          {createdOrder ? (
            /* Confirmation Success Screen */
            <div className="text-center py-8 space-y-6 animate-in fade-in duration-300">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle size={36} />
              </div>
              <div>
                <h4 className="text-2xl font-black text-[#2D1B4E]">
                  Invoice Created Successfully!
                </h4>
                <p className="text-sm font-bold text-[#8E2A8B] mt-1">
                  Invoice Number: {createdOrder.invoice_number}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Customer: {createdOrder.customer_name} | Total: ₹
                  {createdOrder.total}
                </p>
              </div>

              <div className="bg-purple-50 p-4 rounded-xl max-w-md mx-auto text-left text-xs space-y-1.5 border border-purple-100">
                <div className="flex justify-between">
                  <span className="text-gray-500 font-bold">Source:</span>
                  <span className="font-bold text-[#2D1B4E] uppercase">
                    {createdOrder.source}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-bold">
                    Place of Supply:
                  </span>
                  <span className="font-bold text-gray-800">
                    {createdOrder.place_of_supply}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-bold">
                    Payment Status:
                  </span>
                  <span className="font-bold text-emerald-600 uppercase">
                    {createdOrder.payment_status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-bold">
                    Idempotency Key:
                  </span>
                  <span className="font-mono text-[10px] text-gray-600">
                    {createdOrder.idempotency_key}
                  </span>
                </div>
              </div>

              <div className="flex justify-center gap-4 pt-4">
                {onGenerateInvoicePdf && (
                  <button
                    onClick={() => {
                      onGenerateInvoicePdf({
                        id: createdOrder.id,
                        orderId: createdOrder.order_id,
                        invoice_number: createdOrder.invoice_number,
                        date:
                          createdOrder.invoice_date || createdOrder.created_at,
                        customerName: createdOrder.customer_name,
                        customerEmail: createdOrder.customer_email,
                        customerPhone: createdOrder.customer_phone,
                        address: createdOrder.address,
                        city: createdOrder.city,
                        state: createdOrder.state,
                        pincode: createdOrder.pincode,
                        total: createdOrder.total,
                        invoice_date: createdOrder.invoice_date,
                        payment_method: createdOrder.payment_method,
                        payment_status: createdOrder.payment_status,
                        place_of_supply: createdOrder.place_of_supply,
                        customer_gstin: createdOrder.customer_gstin,
                        items:
                          typeof createdOrder.items === "string"
                            ? JSON.parse(createdOrder.items)
                            : createdOrder.items,
                        subtotal_server: createdOrder.subtotal_server,
                        shipping_server: createdOrder.shipping_server,
                        total_server: createdOrder.total_server,
                        total_gst_server: createdOrder.total_gst_server,
                        discount_server: createdOrder.discount_server,
                        cgst_server: createdOrder.cgst_server,
                        sgst_server: createdOrder.sgst_server,
                        igst_server: createdOrder.igst_server
                      });
                    }}
                    className="bg-[#8E2A8B] text-white px-6 py-2.5 rounded-xl font-bold hover:bg-[#2D1B4E] transition-all flex items-center gap-2 shadow-md"
                  >
                    <FileText size={18} />
                    Download / Print Invoice
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="bg-gray-100 text-gray-700 px-6 py-2.5 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitInvoice} className="space-y-6">
              {errorMessage && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold flex items-center gap-3">
                  <AlertCircle size={18} className="shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* SECTION 1: Customer Details */}
              <div className="bg-gray-50/70 p-5 rounded-2xl border border-gray-100 space-y-4">
                <h4 className="text-sm font-black text-[#2D1B4E] uppercase tracking-wider flex items-center gap-2">
                  <User size={16} className="text-[#8E2A8B]" />
                  1. Customer Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      Customer Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Full Name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-[#8E2A8B]/20 focus:border-[#8E2A8B] outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      Company Name
                    </label>
                    <input
                      type="text"
                      placeholder="Company (Optional)"
                      value={customerCompany}
                      onChange={(e) => setCustomerCompany(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-[#8E2A8B]/20 focus:border-[#8E2A8B] outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      GSTIN
                    </label>
                    <input
                      type="text"
                      placeholder="33AAAAA0000A1Z5"
                      value={customerGstin}
                      onChange={(e) => setCustomerGstin(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-[#8E2A8B]/20 focus:border-[#8E2A8B] outline-none font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="email@example.com"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-[#8E2A8B]/20 focus:border-[#8E2A8B] outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      placeholder="+91 9876543210"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-[#8E2A8B]/20 focus:border-[#8E2A8B] outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#8E2A8B] block mb-1">
                      Place of Supply (State) *
                    </label>
                    <select
                      value={placeOfSupply}
                      onChange={(e) => setPlaceOfSupply(e.target.value)}
                      className="w-full border border-[#8E2A8B]/40 rounded-lg px-3 py-2 text-xs font-bold bg-white text-[#2D1B4E] focus:ring-2 focus:ring-[#8E2A8B]/20 outline-none"
                    >
                      {INDIAN_STATES.map((state) => (
                        <option key={state} value={state}>
                          {state} {state === "Tamil Nadu" ? "(CGST + SGST)" : "(IGST)"}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      Billing Address
                    </label>
                    <input
                      type="text"
                      placeholder="Street address, building, suite"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-[#8E2A8B]/20 focus:border-[#8E2A8B] outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      City & Pincode
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="City"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-2/3 border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-[#8E2A8B]/20 focus:border-[#8E2A8B] outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Pincode"
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value)}
                        className="w-1/3 border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-[#8E2A8B]/20 focus:border-[#8E2A8B] outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Product Selection */}
              <div className="bg-gray-50/70 p-5 rounded-2xl border border-gray-100 space-y-4">
                <h4 className="text-sm font-black text-[#2D1B4E] uppercase tracking-wider flex items-center gap-2">
                  <Building size={16} className="text-[#8E2A8B]" />
                  2. Product Selection
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="offline-invoice-product-search"
                      className="text-xs font-bold text-gray-700 block mb-1"
                    >
                      Search Products
                    </label>
                    <div className="relative">
                      <Search
                        size={15}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        id="offline-invoice-product-search"
                        type="search"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        placeholder="Search by product name or SKU"
                        className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-xs focus:ring-2 focus:ring-[#8E2A8B]/20 focus:border-[#8E2A8B] outline-none bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="offline-invoice-product-category"
                      className="text-xs font-bold text-gray-700 block mb-1"
                    >
                      Filter by Category
                    </label>
                    <select
                      id="offline-invoice-product-category"
                      value={productCategory}
                      onChange={(e) => setProductCategory(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-[#8E2A8B]/20 outline-none bg-white"
                    >
                      <option value="">All Categories</option>
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-3 items-end">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      Select Product ({filteredProducts.length})
                    </label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => {
                        setSelectedProductId(e.target.value);
                        setSelectedVariant(null);
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-[#8E2A8B]/20 outline-none bg-white"
                    >
                      <option value="">-- Choose Product --</option>
                      {Object.entries(groupedProducts).map(
                        ([category, categoryProducts]) => (
                          <optgroup key={category} label={category}>
                            {categoryProducts.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} (₹{p.price} | GST: {p.gst_rate || 0}%)
                              </option>
                            ))}
                          </optgroup>
                        )
                      )}
                    </select>
                    {filteredProducts.length === 0 && (
                      <p className="mt-1 text-xs text-gray-500">
                        No products match your search and category.
                      </p>
                    )}
                  </div>

                  {/* Variant Selection if available */}
                  {selectedProductId &&
                    products.find((p) => p.id === selectedProductId)?.variants && (
                      <div className="w-48">
                        <label className="text-xs font-bold text-gray-700 block mb-1">
                          Variant
                        </label>
                        <select
                          onChange={(e) => {
                            const prod = products.find(
                              (p) => p.id === selectedProductId
                            );
                            const varMatch = prod?.variants?.find(
                              (v) => v.weight === e.target.value
                            );
                            setSelectedVariant(varMatch || null);
                          }}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-[#8E2A8B]/20 outline-none bg-white"
                        >
                          <option value="">Default Variant</option>
                          {products
                            .find((p) => p.id === selectedProductId)
                            ?.variants?.map((v: any, idx: number) => (
                              <option key={idx} value={v.weight}>
                                {v.weight} (₹{v.price})
                              </option>
                            ))}
                        </select>
                      </div>
                    )}

                  <div className="w-24">
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={selectedQty}
                      onChange={(e) =>
                        setSelectedQty(Math.max(1, Number(e.target.value)))
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-[#8E2A8B]/20 outline-none text-center font-bold"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddItem}
                    disabled={!selectedProductId}
                    className="bg-[#8E2A8B] hover:bg-[#2D1B4E] text-white px-5 py-2 rounded-lg font-bold text-xs transition-colors flex items-center gap-1 shadow-sm disabled:opacity-50"
                  >
                    <Plus size={16} /> Add Product
                  </button>
                </div>

                {/* Line Items Table */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-100 text-gray-700 font-bold uppercase border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-2.5">Product</th>
                        <th className="px-4 py-2.5 text-center">Unit Price</th>
                        <th className="px-4 py-2.5 text-center">Qty</th>
                        <th className="px-4 py-2.5 text-center">GST Rate</th>
                        <th className="px-4 py-2.5 text-right">Subtotal</th>
                        <th className="px-4 py-2.5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {lineItems.map((item, index) => {
                        const itemSub = item.price * item.quantity;
                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-bold text-gray-800">
                              {item.name}
                              {item.selectedVariant && (
                                <span className="text-[10px] text-purple-600 ml-2 font-normal">
                                  ({item.selectedVariant.weight})
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              ₹{item.price}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <input
                                type="number"
                                min={1}
                                value={item.quantity}
                                onChange={(e) =>
                                  handleUpdateQty(
                                    index,
                                    Number(e.target.value)
                                  )
                                }
                                className="w-16 border border-gray-300 rounded px-2 py-0.5 text-center font-bold"
                              />
                            </td>
                            <td className="px-4 py-3 text-center">
                              {item.gst_rate}%
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-gray-900">
                              ₹{itemSub.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(index)}
                                className="text-red-500 hover:text-red-700 p-1"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {lineItems.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-8 text-center text-gray-400 italic"
                          >
                            No products added to invoice yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION 3: Discounts, Shipping & Payments */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50/70 p-5 rounded-2xl border border-gray-100 space-y-4">
                  <h4 className="text-sm font-black text-[#2D1B4E] uppercase tracking-wider flex items-center gap-2">
                    <DollarSign size={16} className="text-[#8E2A8B]" />
                    3. Discount & Shipping
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1">
                        Discount (₹)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={discountAmount}
                        onChange={(e) =>
                          setDiscountAmount(
                            Math.max(0, Number(e.target.value))
                          )
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-[#8E2A8B]/20 outline-none"
                      />
                      <span className="text-[10px] text-gray-400">
                        Applied before GST
                      </span>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1">
                        Shipping Fee (₹)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={shippingFee}
                        onChange={(e) =>
                          setShippingFee(Math.max(0, Number(e.target.value)))
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-[#8E2A8B]/20 outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      Payment Method & Status
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-xs font-bold bg-white"
                      >
                        <option value="Cash">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Card">Card</option>
                        <option value="Other">Other</option>
                      </select>

                      <select
                        value={paymentStatus}
                        onChange={(e) =>
                          setPaymentStatus(e.target.value as any)
                        }
                        className="border border-gray-300 rounded-lg px-3 py-2 text-xs font-bold bg-white"
                      >
                        <option value="paid">Paid</option>
                        <option value="pending">Pending</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1">
                        Payment Reference / UTR
                      </label>
                      <input
                        type="text"
                        placeholder="Transaction ID / Cash Ref"
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-[#8E2A8B]/20 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1">
                        Invoice Date
                      </label>
                      <input
                        type="date"
                        value={invoiceDate}
                        onChange={(e) => setInvoiceDate(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-[#8E2A8B]/20 outline-none bg-white font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 4: Live Server-Calculated Price Preview */}
                <div className="bg-purple-900 text-white p-5 rounded-2xl flex flex-col justify-between shadow-lg">
                  <div>
                    <div className="flex items-center justify-between border-b border-purple-700 pb-3 mb-4">
                      <h4 className="text-sm font-black uppercase tracking-wider flex items-center gap-2 text-purple-200">
                        <Sparkles size={16} className="text-purple-300" />
                        Server Pricing Breakdown
                      </h4>
                      {isPreviewLoading && (
                        <span className="text-[10px] bg-purple-800 text-purple-200 px-2 py-0.5 rounded animate-pulse">
                          Calculating...
                        </span>
                      )}
                    </div>

                    {preview ? (
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between text-purple-200">
                          <span>Subtotal:</span>
                          <span className="font-bold">
                            ₹{preview.subtotal?.toLocaleString()}
                          </span>
                        </div>

                        {preview.discount > 0 && (
                          <div className="flex justify-between text-emerald-300">
                            <span>Discount (Before GST):</span>
                            <span className="font-bold">
                              -₹{preview.discount?.toLocaleString()}
                            </span>
                          </div>
                        )}

                        <div className="flex justify-between text-purple-100 font-bold border-t border-purple-800/80 pt-1.5">
                          <span>Taxable Amount:</span>
                          <span>
                            ₹{preview.taxableAmount?.toLocaleString()}
                          </span>
                        </div>

                        {preview.cgst > 0 && (
                          <div className="flex justify-between text-purple-300 text-[11px]">
                            <span>CGST (Intra-state):</span>
                            <span>₹{preview.cgst}</span>
                          </div>
                        )}

                        {preview.sgst > 0 && (
                          <div className="flex justify-between text-purple-300 text-[11px]">
                            <span>SGST (Intra-state):</span>
                            <span>₹{preview.sgst}</span>
                          </div>
                        )}

                        {preview.igst > 0 && (
                          <div className="flex justify-between text-purple-300 text-[11px]">
                            <span>IGST (Inter-state):</span>
                            <span>₹{preview.igst}</span>
                          </div>
                        )}

                        {preview.shippingFee > 0 && (
                          <div className="flex justify-between text-purple-200">
                            <span>Shipping Fee:</span>
                            <span>₹{preview.shippingFee}</span>
                          </div>
                        )}

                        {preview.shippingTax > 0 && (
                          <div className="flex justify-between text-purple-300 text-[11px]">
                            <span>GST on Shipping:</span>
                            <span>₹{preview.shippingTax}</span>
                          </div>
                        )}

                        <div className="border-t border-purple-700 pt-3 mt-3 flex justify-between items-baseline">
                          <span className="text-sm font-black text-white">
                            Grand Total:
                          </span>
                          <span className="text-2xl font-black text-amber-300">
                            ₹{preview.grandTotal?.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-purple-300/60 italic text-xs">
                        Add products to calculate live server pricing breakdown
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-purple-800">
                    <button
                      type="submit"
                      disabled={
                        isSubmitting ||
                        lineItems.length === 0 ||
                        !customerName.trim()
                      }
                      className="w-full bg-amber-400 hover:bg-amber-300 text-[#2D1B4E] font-black py-3 rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-40 disabled:hover:bg-amber-400 flex items-center justify-center gap-2 text-sm"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-[#2D1B4E]/30 border-t-[#2D1B4E] rounded-full animate-spin"></div>
                          Generating Invoice...
                        </>
                      ) : (
                        <>
                          <CheckCircle size={18} />
                          Generate & Issue Invoice
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
