"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

type Product = {
  id: number;
  name: string;
  unit: string;
  price: number;
  stock: number;
  active: boolean;
};

type EditForm = {
  name: string;
  unit: string;
  price: string;
  stock: string; 
};

export default function AdminProductsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    name: "",
    unit: "",
    price: "",
    stock: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/products/admin");
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    const res = await apiFetch("/api/products/admin", {
      method: "POST",
      body: JSON.stringify({
        name,
        unit,
        price: Number(price),
        stock: Number(stock),
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error || "Error creando producto");
      return;
    }

    setName("");
    setUnit("");
    setPrice("");
    setStock("");
    await load();
  };

  const toggleActive = async (p: Product) => {
    const res = await apiFetch(`/api/products/admin/${p.id}`, {
      method: "PATCH",
      body: JSON.stringify({ active: !p.active }),
    });

    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error || "Error actualizando producto");
      return;
    }

    await load();
  };

  const startEdit = (p: Product) => {
    setEditingId(p.id);
    setEditForm({
      name: p.name,
      unit: p.unit,
      price: String(p.price),
      stock: String(p.stock),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({
      name: "",
      unit: "",
      price: "",
      stock: "",
    });
  };

  const saveEdit = async (id: number) => {
    const res = await apiFetch(`/api/products/admin/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: editForm.name,
        unit: editForm.unit,
        price: Number(editForm.price),
        stock: Number(editForm.stock),
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error || "Error guardando cambios");
      return;
    }

    cancelEdit();
    await load();
  };


  if (loading) return <div className="p-6 text-gray-700">Cargando...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-white p-6 space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-amber-200 bg-white shadow-sm overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />
        <div className= "flex items-center gap-3 p-4 md:gap-4 md:p-6">
          <img src = "/logo2.jpeg" alt="Morticia" className="w-18 h-18 md:w-18 md:h-18 rounded-lg object-cover border border-gray-200" />
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Productos</h1>
          <p className="mt-1 text-sm text-gray-700">
            Administración del catálogo de Morticia-SAS
          </p>
        </div>
        </div>
      </div>

      {/* Crear producto */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b bg-gray-900">
          <h2 className="font-semibold text-white">Crear producto</h2>
          <p className="text-sm text-gray-300">
            Agregá nuevos productos al catálogo
          </p>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input
              className="border border-gray-300 bg-white px-3 py-2 rounded-lg text-gray-900 placeholder:text-gray-400"
              placeholder="Nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <input
              className="border border-gray-300 bg-white px-3 py-2 rounded-lg text-gray-900 placeholder:text-gray-400"
              placeholder="Unidad (ej: caja x 50)"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            />

            <input
              className="border border-gray-300 bg-white px-3 py-2 rounded-lg text-gray-900 placeholder:text-gray-400"
              placeholder="Precio"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />

            <input
              className="border border-gray-300 bg-white px-3 py-2 rounded-lg text-gray-900 placeholder:text-gray-400"
              placeholder="Stock"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
            />

            <button
              className="w-full md:w-auto rounded-lg px-4 py-2 font-medium bg-amber-500 hover:bg-amber-600 text-gray-950 transition"
              onClick={create}
            >
              Crear
            </button>
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b bg-gray-50">
          <h2 className="font-semibold text-gray-900">Listado de productos</h2>
          <p className="text-sm text-gray-600">
            Edita nombre, unidad, precio, stock y activación
          </p>
        </div>

        {items.length === 0 ? (
          <div className="p-6 text-center text-gray-600">
            No hay productos todavía.
          </div>
        ) : (
          <>
            {/* Mobile */}
            <div className="divide-y md:hidden">
              {items.map((p) => {
                const isEditing = editingId === p.id;

                return (
                  <div key={p.id} className="p-4 space-y-3">
                    {isEditing ? (
                      <>
                        <input
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
                          value={editForm.name}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, name: e.target.value }))
                          }
                        />

                        <input
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
                          value={editForm.unit}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, unit: e.target.value }))
                          }
                        />

                        <input
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
                          value={editForm.price}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, price: e.target.value }))
                          }
                        />

                        <input
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
                          value={editForm.stock}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, stock: e.target.value }))
                          }
                        />
                      </>
                    ) : (
                      <>
                        <div className="font-semibold text-gray-900">{p.name}</div>

                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="text-gray-500">Unidad</div>
                          <div className="text-right text-gray-900">{p.unit}</div>

                          <div className="text-gray-500">Precio</div>
                          <div className="text-right text-gray-900">
                            ${Number(p.price).toLocaleString()}
                          </div>

                          <div className="text-gray-500">Stock</div>
                          <div className="text-right">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                                p.stock > 0
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {p.stock}
                            </span>
                          </div>

                          <div className="text-gray-500">Activo</div>
                          <div className="text-right">
                            <button
                              className={`px-3 py-1 rounded-lg border text-xs font-semibold transition ${
                                p.active
                                  ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                                  : "bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                              }`}
                              onClick={() => toggleActive(p)}
                            >
                              {p.active ? "ON" : "OFF"}
                            </button>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="flex flex-wrap justify-end gap-2 pt-2">
                      {isEditing ? (
                        <>
                          <button
                            className="px-3 py-2 rounded-lg bg-black text-white text-xs"
                            onClick={() => saveEdit(p.id)}
                          >
                            Guardar
                          </button>
                          <button
                            className="px-3 py-2 rounded-lg border text-xs text-gray-700"
                            onClick={cancelEdit}
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <button
                          className="px-3 py-2 rounded-lg border border-amber-300 text-amber-700 text-xs hover:bg-amber-50"
                          onClick={() => startEdit(p)}
                        >
                          Editar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <div className="min-w-[850px]">
                <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b font-semibold text-sm bg-amber-50 text-gray-800">
                  <div className="col-span-3">Nombre</div>
                  <div className="col-span-2">Unidad</div>
                  <div className="col-span-2">Precio</div>
                  <div className="col-span-2">Stock</div>
                  <div className="col-span-1 text-right">Act.</div>
                  <div className="col-span-2 text-right">Acciones</div>
                </div>

                {items.map((p, idx) => {
                  const isEditing = editingId === p.id;

                  return (
                    <div
                      key={p.id}
                      className={`grid grid-cols-12 gap-2 px-4 py-3 border-b text-sm items-center ${
                        idx % 2 === 0 ? "bg-white" : "bg-gray-50/60"
                      }`}
                    >
                      <div className="col-span-3">
                        {isEditing ? (
                          <input
                            className="w-full border border-gray-300 rounded-lg px-2 py-1 text-gray-900"
                            value={editForm.name}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, name: e.target.value }))
                            }
                          />
                        ) : (
                          <span className="font-medium text-gray-900">{p.name}</span>
                        )}
                      </div>

                      <div className="col-span-2">
                        {isEditing ? (
                          <input
                            className="w-full border border-gray-300 rounded-lg px-2 py-1 text-gray-900"
                            value={editForm.unit}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, unit: e.target.value }))
                            }
                          />
                        ) : (
                          <span className="text-gray-700">{p.unit}</span>
                        )}
                      </div>

                      <div className="col-span-2">
                        {isEditing ? (
                          <input
                            className="w-full border border-gray-300 rounded-lg px-2 py-1 text-gray-900"
                            value={editForm.price}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, price: e.target.value }))
                            }
                          />
                        ) : (
                          <span className="text-gray-900">
                            ${Number(p.price).toLocaleString()}
                          </span>
                        )}
                      </div>

                      <div className="col-span-2">
                        {isEditing ? (
                          <input
                            className="w-full border border-gray-300 rounded-lg px-2 py-1 text-gray-900"
                            value={editForm.stock}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, stock: e.target.value }))
                            }
                          />
                        ) : (
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                              p.stock > 0
                                ? "bg-amber-100 text-amber-800"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {p.stock}
                          </span>
                        )}
                      </div>

                      <div className="col-span-1 flex justify-end">
                        <button
                          className={`px-3 py-1 rounded-lg border text-xs font-semibold transition ${
                            p.active
                              ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                              : "bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                          }`}
                          onClick={() => toggleActive(p)}
                        >
                          {p.active ? "ON" : "OFF"}
                        </button>
                      </div>

                      <div className="col-span-2 flex justify-end gap-2">
                        {isEditing ? (
                          <>
                            <button
                              className="px-3 py-1 rounded-lg bg-black text-white text-xs"
                              onClick={() => saveEdit(p.id)}
                            >
                              Guardar
                            </button>
                            <button
                              className="px-3 py-1 rounded-lg border text-xs text-gray-700"
                              onClick={cancelEdit}
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <button
                            className="px-3 py-1 rounded-lg border border-amber-300 text-amber-700 text-xs hover:bg-amber-50"
                            onClick={() => startEdit(p)}
                          >
                            Editar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
          
            