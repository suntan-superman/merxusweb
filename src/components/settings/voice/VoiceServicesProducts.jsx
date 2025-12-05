import { useState, useEffect } from 'react';
import {
  GridComponent,
  ColumnsDirective,
  ColumnDirective,
  Page,
  Sort,
  Filter,
  Toolbar,
  Edit,
  Inject,
  Search,
  Resize,
} from '@syncfusion/ej2-react-grids';
import toast from 'react-hot-toast';
import FormModal from '../../common/FormModal';
import ConfirmationModal from '../../common/ConfirmationModal';
import { 
  getServicesForIndustry, 
  convertServicesToObjects 
} from '../../../../data/industryServicesProductsMultilingual';

/**
 * Voice Services & Products Management Component
 * Allows businesses to manage their services and products
 * - Auto-populates from industry templates
 * - Editable availability status
 * - Optional pricing and categories
 */
export default function VoiceServicesProducts({ settings, onSave, saving, businessType = null }) {
  const [services, setServices] = useState(settings.services || []);
  const [products, setProducts] = useState(settings.products || []);
  const [showServiceDialog, setShowServiceDialog] = useState(false);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [serviceForm, setServiceForm] = useState({
    name: '',
    available: true,
    price_range: '',
    category: '',
    notes: '',
  });
  const [productForm, setProductForm] = useState({
    name: '',
    in_stock: true,
    price_range: '',
    category: '',
    notes: '',
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'service'|'product', item: {} }

  // Update local state when settings change
  useEffect(() => {
    if (settings.services) {
      setServices(settings.services);
    }
    if (settings.products) {
      setProducts(settings.products);
    }
  }, [settings.services, settings.products]);

  // Auto-populate services when business type is selected (only if no services exist)
  useEffect(() => {
    // Only run if we have a business type and no existing services
    const hasExistingServices = settings.services && settings.services.length > 0;
    if (
      businessType?.category && 
      businessType?.industry && 
      !hasExistingServices
    ) {
      const industryServices = getServicesForIndustry(
        businessType.category,
        businessType.industry
      );
      if (industryServices.length > 0) {
        const serviceObjects = convertServicesToObjects(industryServices);
        // Auto-populate and save
        setServices(serviceObjects);
        onSave({ services: serviceObjects });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessType?.category, businessType?.industry]);

  function handleSaveServices(newServices) {
    onSave({ services: newServices });
    setServices(newServices);
  }

  function handleSaveProducts(newProducts) {
    onSave({ products: newProducts });
    setProducts(newProducts);
  }

  function handleAddService() {
    setEditingService(null);
    setServiceForm({
      name: '',
      available: true,
      price_range: '',
      category: '',
      notes: '',
    });
    setShowServiceDialog(true);
  }

  function handleEditService(service) {
    setEditingService(service);
    // Use name_en as primary, fallback to name
    setServiceForm({
      name: service.name || service.name_en || '',
      available: service.available !== false,
      price_range: service.price_range || '',
      category: service.category || '',
      notes: service.notes || '',
    });
    setShowServiceDialog(true);
  }

  function handleSaveService() {
    const newService = {
      name: serviceForm.name.trim(),
      available: serviceForm.available,
      ...(serviceForm.price_range && { price_range: serviceForm.price_range.trim() }),
      ...(serviceForm.category && { category: serviceForm.category.trim() }),
      ...(serviceForm.notes && { notes: serviceForm.notes.trim() }),
      // Preserve multilingual fields if they exist
      ...(editingService?.name_en && { name_en: editingService.name_en }),
      ...(editingService?.name_es && { name_es: editingService.name_es }),
      ...(editingService?.synonyms_en && { synonyms_en: editingService.synonyms_en }),
      ...(editingService?.synonyms_es && { synonyms_es: editingService.synonyms_es }),
    };

    let newServices;
    if (editingService) {
      // Update existing
      newServices = services.map(s => 
        s === editingService ? newService : s
      );
    } else {
      // Add new
      newServices = [...services, newService];
    }

    handleSaveServices(newServices);
    setShowServiceDialog(false);
  }

  function handleDeleteService(service) {
    setDeleteTarget({ type: 'service', item: service });
    setShowDeleteConfirm(true);
  }

  function confirmDelete() {
    if (!deleteTarget) return;

    const targetName = (deleteTarget.item?.name || deleteTarget.item?.name_en || '').toLowerCase();
    const targetCategory = (deleteTarget.item?.category || '').toLowerCase();

    if (deleteTarget.type === 'service') {
      const newServices = services.filter((s) => {
        const nameMatch = (s.name || s.name_en || '').toLowerCase() === targetName;
        const categoryMatch = (s.category || '').toLowerCase() === targetCategory;
        // Remove the first matching item (name + category)
        return !(nameMatch && categoryMatch);
      });
      handleSaveServices(newServices);
      const serviceName = deleteTarget.item.name || deleteTarget.item.name_en || 'Service';
      toast.success(`${serviceName} deleted successfully`);
    } else if (deleteTarget.type === 'product') {
      const targetNotes = (deleteTarget.item?.notes || '').toLowerCase();
      const newProducts = products.filter((p) => {
        const nameMatch = (p.name || '').toLowerCase() === targetName;
        const notesMatch = (p.notes || '').toLowerCase() === targetNotes;
        return !(nameMatch && notesMatch);
      });
      handleSaveProducts(newProducts);
      toast.success(`${deleteTarget.item.name} deleted successfully`);
    }

    setShowDeleteConfirm(false);
    setDeleteTarget(null);
  }

  function handleAddProduct() {
    setEditingProduct(null);
    setProductForm({
      name: '',
      in_stock: true,
      price_range: '',
      category: '',
      notes: '',
    });
    setShowProductDialog(true);
  }

  function handleEditProduct(product) {
    setEditingProduct(product);
    setProductForm({
      name: product.name || '',
      in_stock: product.in_stock !== false,
      price_range: product.price_range || '',
      category: product.category || '',
      notes: product.notes || '',
    });
    setShowProductDialog(true);
  }

  function handleSaveProduct() {
    const newProduct = {
      name: productForm.name.trim(),
      in_stock: productForm.in_stock,
      ...(productForm.price_range && { price_range: productForm.price_range.trim() }),
      ...(productForm.category && { category: productForm.category.trim() }),
      ...(productForm.notes && { notes: productForm.notes.trim() }),
    };

    let newProducts;
    if (editingProduct) {
      // Update existing
      newProducts = products.map(p => 
        p === editingProduct ? newProduct : p
      );
    } else {
      // Add new
      newProducts = [...products, newProduct];
    }

    handleSaveProducts(newProducts);
    setShowProductDialog(false);
  }

  function handleDeleteProduct(product) {
    setDeleteTarget({ type: 'product', item: product });
    setShowDeleteConfirm(true);
  }

  // Service grid templates
  const serviceNameTemplate = (props) => {
    const service = props;
    const displayName = service.name || service.name_en || 'Unnamed Service';
    const hasSynonyms = (service.synonyms_en && service.synonyms_en.length > 0) || 
                        (service.synonyms_es && service.synonyms_es.length > 0);
    const allSynonyms = [
      ...(service.synonyms_en || []),
      ...(service.synonyms_es || [])
    ].filter(syn => syn && syn.toLowerCase() !== displayName.toLowerCase());
    
    return (
      <div className="flex flex-col">
        <span className="font-medium">{displayName}</span>
        {service.name_es && service.name_es !== displayName && (
          <span className="text-xs text-gray-500 italic">{service.name_es}</span>
        )}
        {hasSynonyms && allSynonyms.length > 0 && (
          <span className="text-xs text-gray-400 mt-1" title={allSynonyms.join(', ')}>
            Also: {allSynonyms.slice(0, 3).join(', ')}{allSynonyms.length > 3 ? '...' : ''}
          </span>
        )}
      </div>
    );
  };

  const serviceAvailableTemplate = (props) => {
    return (
      <div className="flex items-center justify-center">
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          props.available 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {props.available ? 'Available' : 'Unavailable'}
        </span>
      </div>
    );
  };

  const serviceActionsTemplate = (props) => {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleEditService(props);
          }}
          className="text-primary-600 hover:text-primary-800 text-sm font-medium"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteService(props);
          }}
          className="text-red-600 hover:text-red-800 text-sm font-medium"
        >
          Delete
        </button>
      </div>
    );
  };

  // Product grid templates
  const productStockTemplate = (props) => {
    return (
      <div className="flex items-center justify-center">
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          props.in_stock 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {props.in_stock ? 'In Stock' : 'Out of Stock'}
        </span>
      </div>
    );
  };

  const productActionsTemplate = (props) => {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleEditProduct(props);
          }}
          className="text-primary-600 hover:text-primary-800 text-sm font-medium"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteProduct(props);
          }}
          className="text-red-600 hover:text-red-800 text-sm font-medium"
        >
          Delete
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Services Section */}
      <section className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Services</h3>
            <p className="text-sm text-gray-600 mt-1">
              Manage the services your business offers. The AI will use this information to answer caller questions accurately.
            </p>
          </div>
          <button
            onClick={handleAddService}
            className="btn-primary"
            disabled={saving}
          >
            + Add Service
          </button>
        </div>

        {services.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
            {businessType?.category && businessType?.industry ? (
              <div>
                <p className="mb-2">No services configured yet.</p>
                <button
                  onClick={() => {
                    const industryServices = getServicesForIndustry(
                      businessType.category,
                      businessType.industry
                    );
                    if (industryServices.length > 0) {
                      const serviceObjects = convertServicesToObjects(industryServices);
                      handleSaveServices(serviceObjects);
                    }
                  }}
                  className="text-primary-600 hover:text-primary-800 font-medium"
                >
                  Load suggested services for {businessType.industry}
                </button>
              </div>
            ) : (
              <p>No services configured. Add your first service to get started.</p>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <GridComponent
              dataSource={services}
              allowPaging={true}
              allowSorting={true}
              allowFiltering={true}
              pageSettings={{ pageSize: 10 }}
              filterSettings={{ type: 'Menu' }}
              height="auto"
            >
              <ColumnsDirective>
                <ColumnDirective
                  field="name"
                  headerText="Service Name"
                  width={280}
                  template={serviceNameTemplate}
                  allowFiltering={true}
                />
                <ColumnDirective
                  field="available"
                  headerText="Status"
                  width={120}
                  template={serviceAvailableTemplate}
                  allowFiltering={true}
                />
                <ColumnDirective
                  field="price_range"
                  headerText="Price Range"
                  width={150}
                  allowFiltering={true}
                />
                <ColumnDirective
                  field="category"
                  headerText="Category"
                  width={150}
                  allowFiltering={true}
                />
                <ColumnDirective
                  headerText="Actions"
                  width={120}
                  template={serviceActionsTemplate}
                  allowFiltering={false}
                  allowSorting={false}
                />
              </ColumnsDirective>
              <Inject services={[Page, Sort, Filter, Search]} />
            </GridComponent>
          </div>
        )}
      </section>

      {/* Products Section */}
      <section className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Products</h3>
            <p className="text-sm text-gray-600 mt-1">
              Manage the products your business sells. Optional but helpful for retail businesses.
            </p>
          </div>
          <button
            onClick={handleAddProduct}
            className="btn-primary"
            disabled={saving}
          >
            + Add Product
          </button>
        </div>

        {products.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
            <p>No products configured. Add products if your business sells physical items.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <GridComponent
              dataSource={products}
              allowPaging={true}
              allowSorting={true}
              allowFiltering={true}
              pageSettings={{ pageSize: 10 }}
              filterSettings={{ type: 'Menu' }}
              height="auto"
            >
              <ColumnsDirective>
                <ColumnDirective
                  field="name"
                  headerText="Product Name"
                  width={200}
                  allowFiltering={true}
                />
                <ColumnDirective
                  field="in_stock"
                  headerText="Stock Status"
                  width={120}
                  template={productStockTemplate}
                  allowFiltering={true}
                />
                <ColumnDirective
                  field="price_range"
                  headerText="Price Range"
                  width={150}
                  allowFiltering={true}
                />
                <ColumnDirective
                  field="category"
                  headerText="Category"
                  width={150}
                  allowFiltering={true}
                />
                <ColumnDirective
                  headerText="Actions"
                  width={120}
                  template={productActionsTemplate}
                  allowFiltering={false}
                  allowSorting={false}
                />
              </ColumnsDirective>
              <Inject services={[Page, Sort, Filter, Search]} />
            </GridComponent>
          </div>
        )}
      </section>

      {/* Service Dialog */}
      <FormModal
        isOpen={showServiceDialog}
        title={editingService ? 'Edit Service' : 'Add Service'}
        width="500px"
        onClose={() => setShowServiceDialog(false)}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveService();
          }}
          className="space-y-4 p-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Service Name *
            </label>
            <input
              type="text"
              value={serviceForm.name}
              onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
              className="input-field"
              required
              placeholder="e.g., Haircut, Consultation, AC Repair"
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={serviceForm.available}
                onChange={(e) => setServiceForm({ ...serviceForm, available: e.target.checked })}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Available</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price Range (Optional)
            </label>
            <input
              type="text"
              value={serviceForm.price_range}
              onChange={(e) => setServiceForm({ ...serviceForm, price_range: e.target.value })}
              className="input-field"
              placeholder="e.g., $40-$65, $100+, Free consultation"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category (Optional)
            </label>
            <input
              type="text"
              value={serviceForm.category}
              onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })}
              className="input-field"
              placeholder="e.g., Hair, Skin, Emergency"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={serviceForm.notes}
              onChange={(e) => setServiceForm({ ...serviceForm, notes: e.target.value })}
              className="input-field"
              rows={3}
              placeholder="Additional details about this service"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowServiceDialog(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : editingService ? 'Update' : 'Add'} Service
            </button>
          </div>
        </form>
      </FormModal>

      {/* Product Dialog */}
      <FormModal
        isOpen={showProductDialog}
        title={editingProduct ? 'Edit Product' : 'Add Product'}
        width="500px"
        onClose={() => setShowProductDialog(false)}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveProduct();
          }}
          className="space-y-4 p-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Name *
            </label>
            <input
              type="text"
              value={productForm.name}
              onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
              className="input-field"
              required
              placeholder="e.g., Shampoo, Office Chair, Gift Card"
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={productForm.in_stock}
                onChange={(e) => setProductForm({ ...productForm, in_stock: e.target.checked })}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">In Stock</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price Range (Optional)
            </label>
            <input
              type="text"
              value={productForm.price_range}
              onChange={(e) => setProductForm({ ...productForm, price_range: e.target.value })}
              className="input-field"
              placeholder="e.g., $15-$25, $99.99"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category (Optional)
            </label>
            <input
              type="text"
              value={productForm.category}
              onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
              className="input-field"
              placeholder="e.g., Hair Care, Electronics, Gift Cards"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={productForm.notes}
              onChange={(e) => setProductForm({ ...productForm, notes: e.target.value })}
              className="input-field"
              rows={3}
              placeholder="Additional details about this product"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowProductDialog(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : editingProduct ? 'Update' : 'Add'} Product
            </button>
          </div>
        </form>
      </FormModal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
        title={`Delete ${deleteTarget?.type === 'service' ? 'Service' : 'Product'}`}
        message={`Are you sure you want to delete "${deleteTarget?.type === 'service' 
          ? (deleteTarget?.item?.name || deleteTarget?.item?.name_en || 'this service')
          : (deleteTarget?.item?.name || 'this product')}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}

