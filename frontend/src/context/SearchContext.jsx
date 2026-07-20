/**
 * SearchContext
 * Provides global search state shared between Navbar input and SearchResults page.
 */

import { createContext, useContext, useState, useMemo, useRef, useEffect } from "react";
import { buildSearchIndex, searchIndex } from "../mock/searchIndex";

const SearchContext = createContext(null);

export function SearchProvider({ children }) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);  // controls the dropdown

  // Build the index once at startup
  const index = useMemo(() => buildSearchIndex(), []);

  // Debounced search results
  const [results, setResults] = useState([]);
  const debounceRef = useRef(null);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setResults(searchIndex(index, query));
    }, 150);
    return () => clearTimeout(debounceRef.current);
  }, [query, index]);

  const clear = () => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
  };

  return (
    <SearchContext.Provider value={{ query, setQuery, results, isOpen, setIsOpen, clear }}>
      {children}
    </SearchContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("useSearch must be used inside SearchProvider");
  return ctx;
}
