/**
 * SearchContext
 * Provides global search state shared between Navbar input and SearchResults page.
 * Debounced calls hit the real backend /search endpoint.
 */

import { createContext, useContext, useState, useRef, useEffect } from "react";
import api from "../services/api";

const SearchContext = createContext(null);

export function SearchProvider({ children }) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);  // controls the dropdown

  // Debounced search results
  const [results, setResults] = useState([]);
  const debounceRef = useRef(null);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) return;
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.get("/search", { params: { q } });
        setResults(res.data?.data || []);
      } catch {
        setResults([]);
      }
    }, 150);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // Keep the dropdown empty while the query is too short (no sync setState).
  const visibleResults = query.trim().length >= 2 ? results : [];

  const clear = () => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
  };

  return (
    <SearchContext.Provider value={{ query, setQuery, results: visibleResults, isOpen, setIsOpen, clear }}>
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
