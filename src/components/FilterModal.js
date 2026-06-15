import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Dimensions,
  TextInput,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { X, Check, ChevronDown, Search } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { Colors } from '../constants/theme';
import SelectionBottomSheet from './SelectionBottomSheet';

const { height } = Dimensions.get('window');

const DEFAULT_FILTERS = {
  category: [],
  categoryIds: [],
  productType: [],
  productTypeIds: [],
  materialType: [],
  materialTypeIds: [],
  brand: [],
  brandIds: [],
  supplier: [],
  supplierIds: [],
  purchaseType: [],
  purchaseTypeIds: [],
  sort: 'Newest',
  sort_by: 'created_at',
  sort_order: 'DESC',
  status: '',
};

const FilterModal = ({
  showFilter,
  setShowFilter,
  currentTab,
  onApply,
  onReset,
  initialFilters,
}) => {
  const insets = useSafeAreaInsets();

  // ─── Redux ────────────────────────────────────────────────
  const { list: materialTypes } = useSelector(s => s.inventoryMaterialType);
  const { list: brands } = useSelector(s => s.inventoryBrand);
  const { list: suppliers } = useSelector(s => s.inventorySupplier);

  const [tempFilters, setTempFilters] = useState(DEFAULT_FILTERS);

  // ─── SelectionBottomSheet state ───────────────────────────
  const [activeSheet, setActiveSheet] = useState(null);
  // null | 'Material Type' | 'Readymade Category' | 'Brand' | 'Supplier'

  // Reset filters when modal opens
  useEffect(() => {
    if (showFilter) {
      setTempFilters({ ...DEFAULT_FILTERS, ...initialFilters });
    }
  }, [showFilter, initialFilters]);

  // ─── Multi select toggle helper ───────────────────────────
  const toggleMultiSelect = (nameKey, idKey, item) => {
    setTempFilters(prev => {
      const exists = prev[idKey]?.includes(item.id);
      return {
        ...prev,
        [nameKey]: exists
          ? prev[nameKey].filter(n => n !== item.name)
          : [...prev[nameKey], item.name],
        [idKey]: exists
          ? prev[idKey].filter(id => id !== item.id)
          : [...prev[idKey], item.id],
      };
    });
  };

  // ─── Single select toggle helper ─────────────────────────
  const toggleSingleSelect = (nameKey, idKey, item) => {
    setTempFilters(prev => {
      const exists = prev[nameKey].includes(item.name);
      return {
        ...prev,
        [nameKey]: exists ? [] : [item.name],
        [idKey]: exists ? [] : [item.id],
      };
    });
  };

  // ─── Remove chip ──────────────────────────────────────────
  const removeChip = (nameKey, idKey, name) => {
    setTempFilters(prev => {
      const idx = prev[nameKey].indexOf(name);
      return {
        ...prev,
        [nameKey]: prev[nameKey].filter(n => n !== name),
        [idKey]: prev[idKey].filter((_, i) => i !== idx),
      };
    });
  };

  // ─── Chips row ────────────────────────────────────────────
  const renderChips = (nameKey, idKey) => {
    const values = tempFilters[nameKey] || [];
    if (values.length === 0) return null;
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginTop: 10 }}
        contentContainerStyle={{ gap: 8, paddingRight: 16 }}
      >
        {values.map(val => (
          <View key={val} style={styles.chip}>
            <Text style={styles.chipText}>{val}</Text>
            <TouchableOpacity
              onPress={() => removeChip(nameKey, idKey, val)}
              style={{ marginLeft: 6 }}
            >
              <X size={13} color="#6B7280" />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    );
  };

  // ─── Selector trigger button ──────────────────────────────
  const renderSelectorBtn = (label, nameKey, sheetTitle) => {
    const count = tempFilters[nameKey]?.length || 0;
    return (
      <TouchableOpacity
        style={styles.selectorTrigger}
        onPress={() => setActiveSheet(sheetTitle)}
      >
        <Text style={styles.selectorText}>
          {count > 0 ? `${count} selected` : `Select ${label}`}
        </Text>
        <ChevronDown size={18} color="#6B7280" />
      </TouchableOpacity>
    );
  };

  // ─── Sort pills ───────────────────────────────────────────
  const sortOptions = [
    { label: 'Newest', sort_by: 'created_at', sort_order: 'DESC' },
    { label: 'Oldest', sort_by: 'created_at', sort_order: 'ASC' },
    { label: 'A-Z', sort_by: 'name', sort_order: 'ASC' },
    { label: 'Z-A', sort_by: 'name', sort_order: 'DESC' },
  ];

  const purchaseSortOptions = [
    { label: 'Newest', sort_by: 'created_at', sort_order: 'DESC' },
    { label: 'Oldest', sort_by: 'created_at', sort_order: 'ASC' },
    { label: 'A-Z', sort_by: 'invoice_no', sort_order: 'ASC' },
    { label: 'Z-A', sort_by: 'invoice_no', sort_order: 'DESC' },
  ];

  const renderSortPills = () => {
    const activeSortOptions =
      currentTab === 'Purchases' ? purchaseSortOptions : sortOptions;

    return (
    <>
      <Text style={styles.sectionLabel}>Sort By</Text>
      <View style={styles.pillRow}>
        {activeSortOptions.map(opt => {
          const isActive = tempFilters.sort === opt.label;
          return (
            <TouchableOpacity
              key={opt.label}
              onPress={() =>
                setTempFilters(prev => ({
                  ...prev,
                  sort: opt.label,
                  sort_by: opt.sort_by,
                  sort_order: opt.sort_order,
                }))
              }
              style={isActive ? styles.pillActive : styles.pillInactive}
            >
              <Text
                style={
                  isActive ? styles.pillTextActive : styles.pillTextInactive
                }
              >
                {opt.label}
              </Text>
              {isActive && (
                <Check size={13} color="#fff" style={{ marginLeft: 4 }} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </>
    );
  };

  // ─── Status pills ─────────────────────────────────────────
  const renderStatusPills = () => (
    <>
      <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Status</Text>
      <View style={styles.pillRow}>
        {[
          { label: 'All', value: '' },
          { label: 'Active', value: 'true' },
          { label: 'Inactive', value: 'false' },
        ].map(opt => {
          const isActive = tempFilters.status === opt.value;
          return (
            <TouchableOpacity
              key={opt.label}
              onPress={() =>
                setTempFilters(prev => ({ ...prev, status: opt.value }))
              }
              style={isActive ? styles.pillActive : styles.pillInactive}
            >
              <Text
                style={
                  isActive ? styles.pillTextActive : styles.pillTextInactive
                }
              >
                {opt.label}
              </Text>
              {isActive && (
                <Check size={13} color="#fff" style={{ marginLeft: 4 }} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );

  return (
    <>
      {/* ── Main Filter Modal ── */}
      <Modal visible={showFilter} transparent animationType="slide">
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Filter & Sort</Text>
              <TouchableOpacity onPress={() => setShowFilter(false)}>
                <X size={26} color="#111" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              {/* ── 1. MATERIALS ── */}
              {currentTab === 'Materials' && (
                <>
                  <Text style={styles.sectionLabel}>Material Type</Text>
                  {renderSelectorBtn(
                    'material type',
                    'materialType',
                    'Material Type',
                  )}
                  {renderChips('materialType', 'materialTypeIds')}
                  {renderSortPills()}
                  {renderStatusPills()}
                </>
              )}

              {/* ── 2. READYMADES ── */}
              {currentTab === 'Readymades' && (
                <>
                  <Text style={styles.sectionLabel}>Category</Text>
                  {renderSelectorBtn(
                    'category',
                    'category',
                    'Readymade Category',
                  )}
                  {renderChips('category', 'categoryIds')}

                  <Text style={[styles.sectionLabel, { marginTop: 16 }]}>
                    Product Type
                  </Text>
                  {renderSelectorBtn(
                    'product type',
                    'productType',
                    'Product Type',
                  )}
                  {renderChips('productType', 'productTypeIds')}

                  <Text style={[styles.sectionLabel, { marginTop: 16 }]}>
                    Brand
                  </Text>
                  {renderSelectorBtn('brand', 'brand', 'Brand')}
                  {renderChips('brand', 'brandIds')}

                  {renderSortPills()}
                  {renderStatusPills()}
                </>
              )}

              {/* ── 3. PRODUCT TYPES (CatalogManageScreen) ── */}
              {currentTab === 'ProductTypes' && (
                <>
                  <Text style={styles.sectionLabel}>Category</Text>
                  {renderSelectorBtn(
                    'category',
                    'category',
                    'Readymade Category',
                  )}
                  {renderChips('category', 'categoryIds')}
                  {renderSortPills()}
                  {renderStatusPills()}
                </>
              )}

              {/* ── 4. PURCHASES ── */}
              {currentTab === 'Purchases' && (
                <>
                  <Text style={styles.sectionLabel}>Supplier</Text>
                  {renderSelectorBtn('supplier', 'supplier', 'Supplier')}
                  {renderChips('supplier', 'supplierIds')}

                  <Text style={[styles.sectionLabel, { marginTop: 16 }]}>
                    Purchase Type
                  </Text>
                  {renderSelectorBtn(
                    'purchase type',
                    'purchaseType',
                    'Purchase Type',
                  )}
                  {renderChips('purchaseType', 'purchaseTypeIds')}

                  {renderSortPills()}
                </>
              )}

              {currentTab === 'Stock' && (
                <>
                  {renderSortPills()}
                </>
              )}
            </ScrollView>

            {/* Footer buttons */}
            <View style={styles.footerRow}>
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={() => {
                  setTempFilters(DEFAULT_FILTERS);
                  onReset?.();
                }}
              >
                <Text style={styles.resetBtnText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyBtn}
                onPress={() => {
                  onApply(tempFilters);
                  setShowFilter(false);
                }}
              >
                <Text style={styles.applyBtnText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── SelectionBottomSheet — எல்லா types-க்கும் ── */}
      {activeSheet && (
        <SelectionBottomSheet
          visible={!!activeSheet}
          onClose={() => setActiveSheet(null)}
          title={activeSheet}
          multiSelect={
            activeSheet === 'Purchase Type'
              ? false
              : activeSheet === 'Brand'
              ? currentTab === 'Readymades'
              : true
          }
          hideCreateTab={true}
          options={
            activeSheet === 'Purchase Type'
              ? [
                  { id: 'MATERIAL', name: 'Material' },
                  { id: 'READYMADE', name: 'Readymade' },
                ]
              : undefined
          }
          disableCreate={activeSheet === 'Product Type'}
          selectedValue={
            activeSheet === 'Material Type'
              ? tempFilters.materialType[0]
              : activeSheet === 'Product Type'
              ? tempFilters.productType[0]
              : activeSheet === 'Purchase Type'
              ? tempFilters.purchaseType[0]
              : activeSheet === 'Readymade Category'
              ? tempFilters.category[0]
              : activeSheet === 'Brand'
              ? tempFilters.brand[0]
              : undefined
          }
          selectedIds={
            activeSheet === 'Material Type'
              ? tempFilters.materialTypeIds
              : activeSheet === 'Readymade Category'
              ? tempFilters.categoryIds
              : activeSheet === 'Product Type'
              ? tempFilters.productTypeIds
              : activeSheet === 'Purchase Type'
              ? tempFilters.purchaseTypeIds
              : activeSheet === 'Brand'
              ? tempFilters.brandIds
              : activeSheet === 'Supplier'
              ? tempFilters.supplierIds
              : []
          }
          onSelect={item => {
            if (activeSheet === 'Material Type') {
              toggleMultiSelect('materialType', 'materialTypeIds', item);
            } else if (activeSheet === 'Readymade Category') {
              toggleMultiSelect('category', 'categoryIds', item);
            } else if (activeSheet === 'Product Type') {
              toggleMultiSelect('productType', 'productTypeIds', item);
            } else if (activeSheet === 'Purchase Type') {
              toggleSingleSelect('purchaseType', 'purchaseTypeIds', item);
            } else if (activeSheet === 'Brand') {
              if (currentTab === 'Readymades') {
                toggleMultiSelect('brand', 'brandIds', item);
              } else {
                toggleSingleSelect('brand', 'brandIds', item);
              }
            } else if (activeSheet === 'Supplier') {
              toggleMultiSelect('supplier', 'supplierIds', item);
            }
          }}
          onCreateSuccess={item => {
            if (activeSheet === 'Material Type') {
              setTempFilters(prev => {
                if (prev.materialTypeIds.includes(item.id)) {
                  return prev;
                }

                return {
                  ...prev,
                  materialType: [...prev.materialType, item.name],
                  materialTypeIds: [...prev.materialTypeIds, item.id],
                };
              });
            } else if (activeSheet === 'Product Type') {
              setTempFilters(prev => {
                if (prev.productTypeIds.includes(item.id)) {
                  return prev;
                }

                return {
                  ...prev,
                  productType: [...prev.productType, item.name],
                  productTypeIds: [...prev.productTypeIds, item.id],
                };
              });
            } else if (activeSheet === 'Brand' && currentTab === 'Readymades') {
              setTempFilters(prev => {
                if (prev.brandIds.includes(item.id)) {
                  return prev;
                }

                return {
                  ...prev,
                  brand: [...prev.brand, item.name],
                  brandIds: [...prev.brandIds, item.id],
                };
              });
            }
          }}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 16,
    maxHeight: height * 0.9,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  sectionLabel: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 10,
    marginTop: 4,
  },
  selectorTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  selectorText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  chipText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: Colors.primary,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pillActive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
  },
  pillInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pillTextActive: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#fff',
  },
  pillTextInactive: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
  footerRow: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  resetBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  resetBtnText: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: '#374151',
  },
  applyBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: Colors.primary,
  },
  applyBtnText: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: '#fff',
  },
});

export default FilterModal;
