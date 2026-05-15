"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, Loader2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type SearchResult = {
  id: string;
  order_number: string;
  customer_name: string;
  items: { id: string; name: string; blocked: boolean }[];
};

interface OrderQuickSearchProps {
  onSelect: (order: SearchResult, selectedItem?: SearchResult["items"][0]) => void;
  showItems?: boolean;
}

export function OrderQuickSearch({ onSelect, showItems = false }: OrderQuickSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchResults = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/orders/search?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } catch (e) {
      console.error("Search failed", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setIsOpen(true);
    setExpandedOrderId(null);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchResults(val);
    }, 300);
  };

  const handleOrderSelect = (order: SearchResult) => {
    if (showItems && order.items && order.items.length > 0) {
      setExpandedOrderId((prev) => (prev === order.id ? null : order.id));
    } else {
      onSelect(order);
      setIsOpen(false);
      setQuery("");
    }
  };

  const handleItemSelect = (e: React.MouseEvent, order: SearchResult, item: SearchResult["items"][0]) => {
    e.stopPropagation();
    onSelect(order, item);
    setIsOpen(false);
    setQuery("");
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder="Search orders by # or customer..."
          className="w-full h-10 rounded-md border border-input bg-surface pl-9 pr-10 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted animate-spin" />
        )}
      </div>

      {isOpen && query.trim().length > 0 && (
        <div className="absolute z-50 top-[calc(100%+4px)] left-0 right-0 bg-surface border border-border rounded-lg shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150 max-h-80 overflow-y-auto">
          {isLoading && results.length === 0 ? (
            <div className="p-4 text-center text-sm text-text-muted flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-sm text-text-muted">No orders found</div>
          ) : (
            <ul className="divide-y divide-border/50">
              {results.map((order) => {
                const isExpanded = expandedOrderId === order.id;

                return (
                  <li key={order.id}>
                    <button
                      type="button"
                      onClick={() => handleOrderSelect(order)}
                      className={cn(
                        "w-full text-left px-4 py-3 flex items-center justify-between hover:bg-surface-raised transition-colors group",
                        isExpanded ? "bg-primary-soft/10" : ""
                      )}
                    >
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-primary bg-primary-soft px-1.5 py-0.5 rounded">
                            {order.order_number}
                          </span>
                          <span className="font-medium text-text-primary truncate max-w-[150px]">
                            {order.customer_name}
                          </span>
                        </div>
                        <span className="text-xs text-text-muted">
                          {order.items?.length || 0} items
                        </span>
                      </div>
                      
                      {showItems && order.items?.length > 0 && (
                        <ChevronRight 
                          className={cn(
                            "w-4 h-4 text-text-muted transition-transform duration-200",
                            isExpanded ? "rotate-90 text-primary" : "group-hover:text-text-primary"
                          )} 
                        />
                      )}
                    </button>

                    {/* Expandable items section */}
                    {isExpanded && showItems && order.items && order.items.length > 0 && (
                      <div className="bg-surface-raised/50 border-t border-border/30 px-4 py-2">
                        <p className="text-[10px] uppercase font-bold text-text-muted tracking-wider mb-2">
                          Select Item
                        </p>
                        <ul className="space-y-1 pb-2">
                          {order.items.map(item => (
                            <li key={item.id}>
                              <button
                                type="button"
                                onClick={(e) => handleItemSelect(e, order, item)}
                                className="w-full text-left flex items-center justify-between px-3 py-2 rounded-md hover:bg-surface border border-transparent hover:border-border transition-colors group"
                              >
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-border group-hover:bg-primary transition-colors" />
                                  <span className="text-sm font-medium text-text-primary truncate">
                                    {item.name}
                                  </span>
                                </div>
                                {item.blocked && (
                                  <span className="text-[10px] font-bold text-danger bg-danger-soft px-1.5 py-0.5 rounded border border-danger/20">
                                    BLOCKED
                                  </span>
                                )}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
