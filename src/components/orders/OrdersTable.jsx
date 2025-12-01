import { useMemo, useEffect, useRef } from 'react';
import {
  GridComponent,
  ColumnsDirective,
  ColumnDirective,
  Page,
  Sort,
  Filter,
  Toolbar,
  ExcelExport,
  PdfExport,
  Inject,
  Search,
  Resize,
} from '@syncfusion/ej2-react-grids';
import OrderStatusBadge from './OrderStatusBadge';

const GRID_STORAGE_KEY = 'merxus_orders_grid_columns';

export default function OrdersTable({
  orders,
  onOrderClick,
  onStatusChange,
  updatingId,
}) {
  // Transform orders data for the grid
  const gridData = useMemo(() => {
    if (!orders) return [];
    return orders.map((order) => ({
      ...order,
      orderId: `#${order.id?.slice(-6) || '------'}`,
      itemsSummary: formatItems(order.items),
      formattedTotal: order.total ? `$${order.total.toFixed(2)}` : '$0.00',
      formattedDate: formatDateTime(order.createdAt),
      sourceLabel: getSourceLabel(order.source),
    }));
  }, [orders]);

  if (!orders || orders.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
        No orders to display.
      </div>
    );
  }

  const gridRef = useRef(null);

  // Load saved column widths from localStorage
  const savedColumns = useMemo(() => {
    try {
      const saved = localStorage.getItem(GRID_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }, []);

  // Save column widths when they change
  const handleResizeStop = (args) => {
    if (gridRef.current) {
      const columns = gridRef.current.columns;
      const widths = {};
      columns.forEach((col) => {
        if (col.field) {
          widths[col.field] = col.width;
        }
      });
      localStorage.setItem(GRID_STORAGE_KEY, JSON.stringify(widths));
    }
  };

  // Grid toolbar items
  const toolbarOptions = ['Search', 'ExcelExport', 'PdfExport'];

  // Filter settings for Excel-like filtering
  const filterSettings = {
    type: 'Excel',
  };

  // Page settings
  const pageSettings = {
    pageSize: 25,
    pageSizes: [10, 25, 50, 100],
  };

  // Handle row click
  const handleRowSelected = (args) => {
    if (args.data && onOrderClick) {
      // Find the original order object
      const originalOrder = orders.find((o) => o.id === args.data.id);
      if (originalOrder) {
        onOrderClick(originalOrder);
      }
    }
  };

  // Handle toolbar click for export
  const handleToolbarClick = (args) => {
    if (args.item.id?.includes('excelexport')) {
      gridRef.current?.excelExport({
        fileName: `orders-${new Date().toISOString().split('T')[0]}.xlsx`,
      });
    } else if (args.item.id?.includes('pdfexport')) {
      gridRef.current?.pdfExport({
        fileName: `orders-${new Date().toISOString().split('T')[0]}.pdf`,
      });
    }
  };

  // Get column width from saved or default
  const getColumnWidth = (field, defaultWidth) => {
    return savedColumns?.[field] || defaultWidth;
  };

  // Custom cell templates
  const orderTemplate = (props) => (
    <div className="leading-tight py-1">
      <div className="font-medium text-gray-900 text-sm">{props.orderId}</div>
      <div className="text-[11px] text-gray-400 mt-1 max-w-xs truncate">
        {props.itemsSummary}
      </div>
    </div>
  );

  const customerTemplate = (props) => (
    <div className="leading-tight py-1">
      <div className="text-sm text-gray-900 truncate">{props.customerName || 'Unknown'}</div>
      <div className="text-[11px] text-gray-400 mt-1">{formatPhone(props.customerPhone)}</div>
    </div>
  );

  const typeTemplate = (props) => (
    <div className="leading-tight">
      <div className="capitalize text-gray-700 text-sm">{props.orderType}</div>
      <div className="text-[10px] text-gray-400 mt-0.5">{props.sourceLabel}</div>
    </div>
  );

  const statusTemplate = (props) => (
    <OrderStatusBadge status={props.status} />
  );

  const actionsTemplate = (props) => (
    <div onClick={(e) => e.stopPropagation()}>
      <StatusButtonGroup
        order={props}
        isUpdating={updatingId === props.id}
        onStatusChange={onStatusChange}
        orders={orders}
      />
    </div>
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <GridComponent
        ref={gridRef}
        dataSource={gridData}
        allowPaging={true}
        allowSorting={true}
        allowFiltering={true}
        allowResizing={true}
        allowExcelExport={true}
        allowPdfExport={true}
        filterSettings={filterSettings}
        pageSettings={pageSettings}
        toolbar={toolbarOptions}
        toolbarClick={handleToolbarClick}
        rowSelected={handleRowSelected}
        resizeStop={handleResizeStop}
        enableHover={true}
        height="auto"
        rowHeight={65}
      >
        <ColumnsDirective>
          <ColumnDirective
            field="orderId"
            headerText="Order"
            width={getColumnWidth('orderId', 180)}
            minWidth={120}
            template={orderTemplate}
            allowFiltering={true}
          />
          <ColumnDirective
            field="customerName"
            headerText="Customer"
            width={getColumnWidth('customerName', 160)}
            minWidth={120}
            template={customerTemplate}
            allowFiltering={true}
          />
          <ColumnDirective
            field="orderType"
            headerText="Type"
            width={getColumnWidth('orderType', 110)}
            minWidth={90}
            template={typeTemplate}
            allowFiltering={true}
          />
          <ColumnDirective
            field="formattedDate"
            headerText="Created"
            width={getColumnWidth('formattedDate', 140)}
            minWidth={100}
            allowFiltering={true}
            allowSorting={true}
          />
          <ColumnDirective
            field="formattedTotal"
            headerText="Total"
            width={getColumnWidth('formattedTotal', 100)}
            minWidth={80}
            textAlign="Right"
            allowFiltering={true}
          />
          <ColumnDirective
            field="status"
            headerText="Status"
            width={getColumnWidth('status', 120)}
            minWidth={100}
            template={statusTemplate}
            allowFiltering={true}
          />
          <ColumnDirective
            headerText="Actions"
            width={getColumnWidth('actions', 150)}
            minWidth={120}
            template={actionsTemplate}
            allowFiltering={false}
            allowSorting={false}
            textAlign="Right"
          />
        </ColumnsDirective>
        <Inject services={[Page, Sort, Filter, Toolbar, ExcelExport, PdfExport, Search, Resize]} />
      </GridComponent>
    </div>
  );
}

function formatItems(items) {
  if (!items || items.length === 0) return 'No items';
  const summary = items
    .slice(0, 2)
    .map((item) => `${item.quantity}× ${item.name}`)
    .join(', ');
  return items.length > 2 ? `${summary} +${items.length - 2} more` : summary;
}

function formatDateTime(timestamp) {
  if (!timestamp) return '';
  const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();

  if (isToday) {
    return d.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  return d.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatPhone(phone) {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
}

function getSourceLabel(source) {
  switch (source) {
    case 'phone_ai':
      return '🤖 AI Phone';
    case 'online':
      return '🌐 Online';
    case 'pos_import':
      return '💳 POS Import';
    default:
      return source || '';
  }
}

function StatusButtonGroup({ order, isUpdating, onStatusChange, orders }) {
  const nextStatus = getNextStatus(order.status);
  if (!nextStatus) {
    return null;
  }

  // Find original order for status change
  const originalOrder = orders?.find((o) => o.id === order.id) || order;

  return (
    <button
      type="button"
      disabled={isUpdating}
      onClick={() => onStatusChange?.(originalOrder, nextStatus)}
      className={`inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
        isUpdating
          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
          : 'bg-primary-600 text-white hover:bg-primary-700'
      }`}
    >
      {isUpdating ? 'Updating…' : `Mark ${labelForStatus(nextStatus)}`}
    </button>
  );
}

function getNextStatus(status) {
  switch (status) {
    case 'new':
      return 'accepted';
    case 'accepted':
      return 'in_progress';
    case 'in_progress':
      return 'ready';
    case 'ready':
      return 'completed';
    default:
      return null;
  }
}

function labelForStatus(status) {
  switch (status) {
    case 'accepted':
      return 'Accepted';
    case 'in_progress':
      return 'In Progress';
    case 'ready':
      return 'Ready';
    case 'completed':
      return 'Completed';
    default:
      return status;
  }
}
