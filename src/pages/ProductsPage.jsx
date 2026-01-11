import { useState, useEffect } from "react";
import { PlusIcon, PencilIcon, Trash2Icon, XIcon, ImageIcon } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productApi } from "../lib/api";
import { getStockStatusBadge } from "../lib/utils";

function ProductsPage() {
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    price: "",
    stock: "",
    description: "",
  });
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);

  const queryClient = useQueryClient();

  // fetch data - avec transformation des données si nécessaire
  const { 
    data: productsData = {}, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ["products"],
    queryFn: productApi.getAll,
  });

  // Débogage
  useEffect(() => {
    console.log("Products data:", productsData);
    console.log("Type:", typeof productsData);
    console.log("Is array?", Array.isArray(productsData));
  }, [productsData]);

  // Normaliser les données : s'assurer que products est toujours un tableau
  let products = [];
  if (productsData) {
    if (Array.isArray(productsData)) {
      products = productsData;
    } else if (productsData.products && Array.isArray(productsData.products)) {
      products = productsData.products;
    } else if (productsData.data && Array.isArray(productsData.data)) {
      products = productsData.data;
    } else if (typeof productsData === 'object') {
      // Si c'est un objet, tenter de le convertir en tableau
      products = Object.values(productsData);
    }
  }

  // mutations
  const createProductMutation = useMutation({
    mutationFn: productApi.create,
    onSuccess: () => {
      closeModal();
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: productApi.update,
    onSuccess: () => {
      closeModal();
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: productApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormData({
      name: "",
      category: "",
      price: "",
      stock: "",
      description: "",
    });
    // Libérer les URLs blob
    imagePreviews.forEach(url => {
      if (url.startsWith('blob:')) URL.revokeObjectURL(url);
    });
    setImages([]);
    setImagePreviews([]);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || "",
      category: product.category || "",
      price: product.price?.toString() || "",
      stock: product.stock?.toString() || "",
      description: product.description || "",
    });
    setImagePreviews(product.images || []);
    setShowModal(true);
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 3) {
      alert("Maximum 3 images allowed");
      return;
    }
    
    // Libérer les anciennes URLs blob
    imagePreviews.forEach(url => {
      if (url.startsWith('blob:')) URL.revokeObjectURL(url);
    });
    
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setImages(files);
    setImagePreviews(newPreviews);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      alert("Product name is required");
      return;
    }

    if (!editingProduct && images.length === 0) {
      alert("Please upload at least one image");
      return;
    }

    const formDataToSend = new FormData();
    formDataToSend.append("name", formData.name);
    formDataToSend.append("description", formData.description);
    formDataToSend.append("price", parseFloat(formData.price) || 0);
    formDataToSend.append("stock", parseInt(formData.stock) || 0);
    formDataToSend.append("category", formData.category);

    if (images.length > 0) {
      images.forEach((image) => formDataToSend.append("images", image));
    }

    if (editingProduct) {
      updateProductMutation.mutate({ 
        id: editingProduct._id, 
        formData: formDataToSend 
      });
    } else {
      createProductMutation.mutate(formDataToSend);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      deleteProductMutation.mutate(id);
    }
  };

  // Rendu conditionnel
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="mt-4 text-gray-600">Loading products...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-error text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold mb-2">Error Loading Products</h2>
          <p className="mb-4 text-red-600">{error.message}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="btn btn-primary"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-600 mt-2">Manage your product inventory</p>
        </div>
        <button 
          onClick={() => setShowModal(true)} 
          className="btn btn-primary flex items-center gap-2 hover:scale-105 transition-transform"
        >
          <PlusIcon className="w-5 h-5" />
          Add Product
        </button>
      </div>

      {/* PRODUCTS LIST */}
      <div className="space-y-6">
        {!Array.isArray(products) || products.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-2xl">
            <div className="text-6xl mb-6 text-gray-400">📦</div>
            <h3 className="text-2xl font-semibold text-gray-800 mb-3">No Products Found</h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Start by adding your first product to manage your inventory
            </p>
            <button 
              onClick={() => setShowModal(true)} 
              className="btn btn-primary btn-lg"
            >
              Add First Product
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => {
              if (!product || typeof product !== 'object') return null;
              
              const status = getStockStatusBadge(product.stock || 0);
              const mainImage = product.images?.[0] || product.image || null;
              
              return (
                <div key={product._id || product.id} className="card bg-white shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-2xl overflow-hidden border border-gray-100">
                  <div className="p-6">
                    {/* Image */}
                    <div className="mb-4">
                      <div className="w-full h-48 bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center">
                        {mainImage ? (
                          <img 
                            src={mainImage} 
                            alt={product.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'%3E%3C/rect%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'%3E%3C/circle%3E%3Cpolyline points='21 15 16 10 5 21'%3E%3C/polyline%3E%3C/svg%3E";
                            }}
                          />
                        ) : (
                          <ImageIcon className="w-16 h-16 text-gray-300" />
                        )}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-gray-900 truncate">
                            {product.name || "Unnamed Product"}
                          </h3>
                          <p className="text-gray-600 text-sm">
                            {product.category || "Uncategorized"}
                          </p>
                        </div>
                        <span className={`badge ${status.class} ml-2`}>
                          {status.text}
                        </span>
                      </div>
                      
                      <p className="text-gray-700 text-sm line-clamp-2 h-10">
                        {product.description || "No description available"}
                      </p>
                      
                      <div className="flex items-center justify-between pt-2">
                        <div className="space-y-1">
                          <div>
                            <p className="text-xs text-gray-500">Price</p>
                            <p className="font-bold text-xl text-gray-900">
                              ${parseFloat(product.price || 0).toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Stock</p>
                            <p className="font-bold text-lg text-gray-900">
                              {product.stock || 0} units
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(product)}
                            className="btn btn-sm btn-outline btn-square"
                            title="Edit"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(product._id || product.id)}
                            className="btn btn-sm btn-outline btn-square text-error border-error hover:bg-error hover:text-white"
                            title="Delete"
                            disabled={deleteProductMutation.isPending}
                          >
                            {deleteProductMutation.isPending ? (
                              <span className="loading loading-spinner loading-xs"></span>
                            ) : (
                              <Trash2Icon className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL - Version corrigée sans input checked problématique */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingProduct ? "Edit Product" : "Add New Product"}
                </h2>
                <button 
                  onClick={closeModal}
                  className="btn btn-sm btn-circle btn-ghost hover:bg-gray-100"
                  disabled={createProductMutation.isPending || updateProductMutation.isPending}
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name & Category */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      className="input input-bordered w-full focus:ring-2 focus:ring-primary"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                      disabled={createProductMutation.isPending || updateProductMutation.isPending}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Category *
                    </label>
                    <select
                      className="select select-bordered w-full focus:ring-2 focus:ring-primary"
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      required
                      disabled={createProductMutation.isPending || updateProductMutation.isPending}
                    >
                      <option value="">Select category</option>
                      <option value="Electronics">Electronics</option>
                      <option value="Accessories">Accessories</option>
                      <option value="Fashion">Fashion</option>
                      <option value="Sports">Sports</option>
                      <option value="Home">Home</option>
                      <option value="Books">Books</option>
                    </select>
                  </div>
                </div>

                {/* Price & Stock */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Price ($) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="input input-bordered w-full focus:ring-2 focus:ring-primary"
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: e.target.value})}
                      required
                      disabled={createProductMutation.isPending || updateProductMutation.isPending}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Stock *
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="input input-bordered w-full focus:ring-2 focus:ring-primary"
                      value={formData.stock}
                      onChange={(e) => setFormData({...formData, stock: e.target.value})}
                      required
                      disabled={createProductMutation.isPending || updateProductMutation.isPending}
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    className="textarea textarea-bordered w-full h-32 focus:ring-2 focus:ring-primary"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    required
                    disabled={createProductMutation.isPending || updateProductMutation.isPending}
                  />
                </div>

                {/* Images */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <span className="flex items-center gap-2">
                      <ImageIcon className="w-5 h-5" />
                      Product Images {!editingProduct && "*"}
                    </span>
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-primary transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageChange}
                      className="file-input file-input-bordered file-input-primary w-full"
                      required={!editingProduct}
                      disabled={createProductMutation.isPending || updateProductMutation.isPending}
                    />
                    <p className="text-sm text-gray-500 mt-3">
                      Maximum 3 images. {!editingProduct ? "Required for new products." : "Leave empty to keep current images."}
                    </p>
                  </div>

                  {imagePreviews.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700 mb-3">Preview:</p>
                      <div className="flex flex-wrap gap-4">
                        {imagePreviews.map((preview, index) => (
                          <div key={index} className="relative group">
                            <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100">
                              <img 
                                src={preview} 
                                alt={`Preview ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const newImages = [...images];
                                const newPreviews = [...imagePreviews];
                                
                                if (preview.startsWith('blob:')) {
                                  URL.revokeObjectURL(preview);
                                }
                                
                                newImages.splice(index, 1);
                                newPreviews.splice(index, 1);
                                
                                setImages(newImages);
                                setImagePreviews(newPreviews);
                              }}
                              className="absolute -top-2 -right-2 btn btn-xs btn-circle btn-error opacity-0 group-hover:opacity-100 transition-opacity"
                              disabled={createProductMutation.isPending || updateProductMutation.isPending}
                            >
                              <XIcon className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal Actions */}
                <div className="flex justify-end gap-4 pt-6 border-t">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="btn btn-outline"
                    disabled={createProductMutation.isPending || updateProductMutation.isPending}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary min-w-32"
                    disabled={createProductMutation.isPending || updateProductMutation.isPending}
                  >
                    {(createProductMutation.isPending || updateProductMutation.isPending) ? (
                      <span className="flex items-center gap-2">
                        <span className="loading loading-spinner"></span>
                        {editingProduct ? "Updating..." : "Creating..."}
                      </span>
                    ) : editingProduct ? (
                      "Update Product"
                    ) : (
                      "Add Product"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductsPage;