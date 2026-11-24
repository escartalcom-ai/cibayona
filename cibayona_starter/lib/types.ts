export type Availability =
  | "DISPONIBLE_PROVEEDOR"
  | "POR_CONFIRMAR"
  | "BAJO_PEDIDO"
  | "AGOTADO"
  | "DESCONTINUADO";

export type Product = {
  id: string;
  sku: string;
  manufacturerCode?: string;
  name: string;
  shortDescription?: string;
  description?: string;
  categoryId?: string;
  categoryName?: string;
  brand?: string;
  model?: string;
  price: number | null;
  promotionalPrice: number | null;
  currency: string;
  unit: string;
  minQuantity: number;
  availability: Availability;
  stockReported: number | null;
  lastVerified?: string;
  leadTime?: string;
  imageUrl?: string;
  gallery?: string[];
  datasheetUrl?: string;
  technicalSource?: string;
  featured: boolean;
};

export type Category = {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  imageUrl?: string;
};

export type CartLine = {
  product: Product;
  quantity: number;
};

export type SessionRole = "admin" | "developer";
