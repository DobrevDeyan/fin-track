"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Filter, X, Download, ArrowUpDown } from "lucide-react"
import { getUniqueCategories } from "@/lib/categories"
import { filterAndSortTransactions } from "@/lib/transaction-filters"

interface Entry {
  id: string
  description: string
  amount: number
  category: string
  date: string
  type: "income" | "expense"
  notes?: string
}

interface TransactionFiltersProps {
  entries: Entry[]
  onFilterChange: (filtered: Entry[]) => void
  onExport?: () => void
}

export function TransactionFilters({
  entries,
  onFilterChange,
  onExport,
}: TransactionFiltersProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [dateFilter, setDateFilter] = useState<string>("all")
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState<string>("date-desc")
  const [customDateRange, setCustomDateRange] = useState({ startDate: "", endDate: "" })
  const [showCustomDateRange, setShowCustomDateRange] = useState(false)

  // Get unique categories from entries
  const categories = getUniqueCategories(entries)

  // Apply filters
  const applyFilters = () => {
    const filtered = filterAndSortTransactions(
      entries,
      {
        searchQuery,
        categoryFilter,
        typeFilter,
        dateFilter,
        customDateRange: showCustomDateRange ? customDateRange : undefined,
      },
      sortBy
    )

    onFilterChange(filtered)
  }

  // Apply filters when any filter changes
  useEffect(() => {
    applyFilters()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, categoryFilter, typeFilter, dateFilter, sortBy, customDateRange.startDate, customDateRange.endDate, entries.length])

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
  }

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value)
  }

  const handleTypeChange = (value: string) => {
    setTypeFilter(value)
  }

  const handleDateChange = (value: string) => {
    setDateFilter(value)
    if (value === "custom") {
      setShowCustomDateRange(true)
    } else {
      setShowCustomDateRange(false)
      setCustomDateRange({ startDate: "", endDate: "" })
    }
  }

  const handleSortChange = (value: string) => {
    setSortBy(value)
  }

  const clearFilters = () => {
    setSearchQuery("")
    setCategoryFilter("all")
    setTypeFilter("all")
    setDateFilter("all")
    setSortBy("date-desc")
    setCustomDateRange({ startDate: "", endDate: "" })
    setShowCustomDateRange(false)
    onFilterChange(entries)
  }

  const hasActiveFilters =
    searchQuery || 
    categoryFilter !== "all" || 
    typeFilter !== "all" || 
    dateFilter !== "all" || 
    sortBy !== "date-desc" ||
    customDateRange.startDate ||
    customDateRange.endDate

  return (
    <Card className="mb-6">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4">
          <CardTitle className="text-lg">Filter & Search Transactions</CardTitle>
          <div className="flex flex-wrap gap-2">
            {onExport && (
              <Button variant="outline" size="sm" onClick={onExport} className="flex-shrink-0">
                <Download className="h-4 w-4 mr-1.5 sm:mr-2" />
                <span className="text-xs sm:text-sm">Export CSV</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex-shrink-0"
            >
              <Filter className="h-4 w-4 mr-1.5 sm:mr-2" />
              <span className="text-xs sm:text-sm">{showFilters ? "Hide" : "Show"} Filters</span>
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="flex-shrink-0">
                <X className="h-4 w-4 mr-1.5 sm:mr-2" />
                <span className="text-xs sm:text-sm">Clear</span>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by description, category, or notes..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t">
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select value={categoryFilter} onValueChange={handleCategoryChange}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select value={typeFilter} onValueChange={handleTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <Select value={dateFilter} onValueChange={handleDateChange}>
                <SelectTrigger>
                  <SelectValue placeholder="All dates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="thisWeek">This Week</SelectItem>
                  <SelectItem value="thisMonth">This Month</SelectItem>
                  <SelectItem value="lastMonth">Last Month</SelectItem>
                  <SelectItem value="thisYear">This Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
              {showCustomDateRange && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Start Date</label>
                    <Input
                      type="date"
                      value={customDateRange.startDate}
                      onChange={(e) =>
                        setCustomDateRange({
                          ...customDateRange,
                          startDate: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">End Date</label>
                    <Input
                      type="date"
                      value={customDateRange.endDate}
                      onChange={(e) =>
                        setCustomDateRange({
                          ...customDateRange,
                          endDate: e.target.value,
                        })
                      }
                      min={customDateRange.startDate}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sort Options */}
        {showFilters && (
          <div className="pt-4 border-t">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              <label className="text-sm font-medium">Sort By</label>
              <Select value={sortBy} onValueChange={handleSortChange}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">Date (Newest First)</SelectItem>
                  <SelectItem value="date-asc">Date (Oldest First)</SelectItem>
                  <SelectItem value="amount-desc">Amount (High to Low)</SelectItem>
                  <SelectItem value="amount-asc">Amount (Low to High)</SelectItem>
                  <SelectItem value="description-asc">Description (A-Z)</SelectItem>
                  <SelectItem value="description-desc">Description (Z-A)</SelectItem>
                  <SelectItem value="category-asc">Category (A-Z)</SelectItem>
                  <SelectItem value="category-desc">Category (Z-A)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

