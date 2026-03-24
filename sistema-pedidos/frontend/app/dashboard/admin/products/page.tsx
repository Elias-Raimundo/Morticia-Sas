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
  categoryId?: number | null;
  category?: {
    id: number;
    name: string;
  } | null;
};

type EditForm = {
  name: string;
  unit: string;
  price: string;
  stock: string; 
  categoryId: string;
};

type Category = {
  id: number;
  name: string;
};

export default function AdminProductsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    name: "",
    unit: "",
    price: "",
    stock: "",
    categoryId: "",
  });

  const [showInlineCategoryForm, setShowInlineCategoryForm] = useState(false);
  const [showCategoryManagerForm, setShowCategoryManagerForm] = useState(false);
  const [newCategoryName, setNewCategoryName]= useState("");
  const [savingCategory, setSavingCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");


  const load = async () => {
    setLoading(true);
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        apiFetch("/api/products/admin"),
        apiFetch("/api/categories"),
      ]);

      const productsData = await productsRes.json().catch(() => []);
      const categoriesData = await categoriesRes.json().catch(() => []);
      setItems(Array.isArray(productsData) ? productsData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
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
        categoryId: categoryId ? Number(categoryId) : null,
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
    setCategoryId("");
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
      categoryId: p.categoryId ? String(p.categoryId) : "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({
      name: "",
      unit: "",
      price: "",
      stock: "",
      categoryId: "",
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
        categoryId: editForm.categoryId ? Number(editForm.categoryId) : null,
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

  const createCategory = async () => {
    const cleanName = newCategoryName.trim();
    if (!cleanName) {
      toast.error("Escribí un nombre para la categoría");
      return;
    }

    setSavingCategory(true);

    try {
      const res = await apiFetch("/api/categories", {
        method: "POST",
        body: JSON.stringify({
          name: cleanName,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data?.error || "Error creando categoría");
        return;
      }

      setCategories((prev) => 
        [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setCategoryId(String(data.id));
      setNewCategoryName("");
      setShowInlineCategoryForm(false);
      setShowCategoryManagerForm(false);
      toast.success("Categoría creada");
    } catch (error) {
      console.error(error);
      toast.error("Error creando categoría");
    } finally {
      setSavingCategory(false);
    }
  };

  const saveCategoryEdit = async (id: number) => {
    const cleanName = editingCategoryName.trim();

    if (!cleanName) {
      toast.error("Escribí un nombre para la categoría");
      return;
    }

    try {
      const res = await apiFetch(`/api/categories/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: cleanName }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data?.error || "Error actualizando categoría");
        return;
      }

      setCategories((prev) =>
        prev
          .map((cat) => (cat.id === id ? data : cat))
          .sort((a, b) => a.name.localeCompare(b.name))
      );

      setItems((prev) =>
        prev.map((item) =>
          item.category?.id === id
            ? {
                ...item,
                category: {
                  ...item.category,
                  name: data.name,
                },
              }
            : item
        )
      );

      setEditingCategoryId(null);
      setEditingCategoryName("");
      toast.success("Categoría actualizada");
    } catch (error) {
      console.error(error);
      toast.error("Error actualizando categoría");
    }
  };

const removeCategory = async (id: number) => {
  if (!confirm("¿Eliminar esta categoría?")) return;

  try {
    const res = await apiFetch(`/api/categories/${id}`, {
      method: "DELETE",
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      toast.error(data?.error || "Error eliminando categoría");
      return;
    }

    setCategories((prev) => prev.filter((cat) => cat.id !== id));

    if (categoryId === String(id)) {
      setCategoryId("");
    }

    if (editForm.categoryId === String(id)) {
      setEditForm((prev) => ({ ...prev, categoryId: "" }));
    }

    toast.success("Categoría eliminada");
  } catch (error) {
    console.error(error);
    toast.error("Error eliminando categoría");
  }
};


  if (loading) return <div className="p-6 text-gray-700">Cargando...</div>;

return (
  <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-white p-6 space-y-6">
    {/* Header */}
    <div className="rounded-2xl border border-amber-200 bg-white shadow-sm overflow-hidden">
      <div className="h-2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />
      <div className="flex items-center gap-3 p-4 md:gap-4 md:p-6">
        <img
          src="/logo2.jpeg"
          alt="Morticia"
          className="w-18 h-18 md:w-18 md:h-18 rounded-lg object-cover border border-gray-200"
        />
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Productos
          </h1>
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
        <div className="grid grid-cols-1 gap-3 md:grid-cols-6 items-start">
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

          <div className="space-y-2">
            <select
              className="w-full border border-gray-300 bg-white px-3 py-2 rounded-lg text-gray-900"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Seleccionar categoría</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>

            {!showInlineCategoryForm ? (
              <button
                type="button"
                onClick={() => setShowInlineCategoryForm(true)}
                className="text-xs font-medium text-amber-700 hover:text-amber-800"
              >
                + Nueva categoría
              </button>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Nombre de categoría"
                  className="flex-1 border border-gray-300 bg-white px-3 py-2 rounded-lg text-sm text-gray-900 placeholder:text-gray-400"
                />

                <button
                  type="button"
                  onClick={createCategory}
                  disabled={savingCategory}
                  className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-gray-950 hover:bg-amber-600 disabled:opacity-60"
                >
                  {savingCategory ? "..." : "Guardar"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowInlineCategoryForm(false);
                    setNewCategoryName("");
                  }}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>

          <button
            className="w-full md:w-auto rounded-lg px-4 py-2 font-medium bg-amber-500 hover:bg-amber-600 text-gray-950 transition"
            onClick={create}
          >
            Crear
          </button>
        </div>
      </div>
    </div>

    {/* Gestión de categorías */}
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b bg-gray-50">
        <h2 className="font-semibold text-gray-900">Categorías</h2>
        <p className="text-sm text-gray-600">
          Creá, editá o eliminá categorías del catálogo
        </p>
      </div>

      <div className="p-5 space-y-4">
        {!showCategoryManagerForm ? (
          <button
            type="button"
            onClick={() => setShowCategoryManagerForm(true)}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-gray-950 hover:bg-amber-600"
          >
            + Nueva categoría
          </button>
        ) : (
          <div className="flex flex-col gap-2 md:flex-row">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Nombre de categoría"
              className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            />

            <button
              type="button"
              onClick={createCategory}
              disabled={savingCategory}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-gray-950 hover:bg-amber-600 disabled:opacity-60"
            >
              {savingCategory ? "Guardando..." : "Guardar"}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowCategoryManagerForm(false);
                setNewCategoryName("");
              }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        )}

        {categories.length === 0 ? (
          <div className="text-sm text-gray-500">No hay categorías todavía.</div>
        ) : (
          <div className="space-y-2">
            {categories.map((cat) => {
              const isEditingCategory = editingCategoryId === cat.id;

              return (
                <div
                  key={cat.id}
                  className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-3 md:flex-row md:items-center md:justify-between"
                >
                  {isEditingCategory ? (
                    <input
                      type="text"
                      value={editingCategoryName}
                      onChange={(e) => setEditingCategoryName(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 md:max-w-sm"
                    />
                  ) : (
                    <span className="font-medium text-gray-900">{cat.name}</span>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {isEditingCategory ? (
                      <>
                        <button
                          type="button"
                          onClick={() => saveCategoryEdit(cat.id)}
                          className="rounded-lg bg-black px-3 py-2 text-xs text-white"
                        >
                          Guardar
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingCategoryId(null);
                            setEditingCategoryName("");
                          }}
                          className="rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCategoryId(cat.id);
                            setEditingCategoryName(cat.name);
                          }}
                          className="rounded-lg border border-amber-300 px-3 py-2 text-xs text-amber-700 hover:bg-amber-50"
                        >
                          Renombrar
                        </button>

                        <button
                          type="button"
                          onClick={() => removeCategory(cat.id)}
                          className="rounded-lg border border-red-200 px-3 py-2 text-xs text-red-600 hover:bg-red-50"
                        >
                          Eliminar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>

    {/* Lista */}
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b bg-gray-50">
        <h2 className="font-semibold text-gray-900">Listado de productos</h2>
        <p className="text-sm text-gray-600">
          Edita nombre, unidad, categoría, precio, stock y activación
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

                      <select
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
                        value={editForm.categoryId}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            categoryId: e.target.value,
                          }))
                        }
                      >
                        <option value="">Seleccionar categoría</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </>
                  ) : (
                    <>
                      <div className="font-semibold text-gray-900">{p.name}</div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="text-gray-500">Unidad</div>
                        <div className="text-right text-gray-900">{p.unit}</div>

                        <div className="text-gray-500">Categoría</div>
                        <div className="text-right text-gray-900">
                          {p.category?.name || "Sin categoría"}
                        </div>

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
                <div className="col-span-2">Nombre</div>
                <div className="col-span-2">Unidad</div>
                <div className="col-span-2">Categoría</div>
                <div className="col-span-2">Precio</div>
                <div className="col-span-1">Stock</div>
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
                    <div className="col-span-2">
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
                        <select
                          className="w-full border border-gray-300 rounded-lg px-2 py-1 text-gray-900"
                          value={editForm.categoryId}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              categoryId: e.target.value,
                            }))
                          }
                        >
                          <option value="">Seleccionar categoría</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-gray-900">
                          {p.category?.name || "Sin categoría"}
                        </span>
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

                    <div className="col-span-1">
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
          
            