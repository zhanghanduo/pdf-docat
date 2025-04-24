import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  // Generate page numbers
  const getPageNumbers = () => {
    const pages = [];
    
    if (totalPages <= 7) {
      // If there are 7 or fewer pages, show all of them
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always include first page
      pages.push(1);
      
      // Calculate start and end pages to show
      let startPage: number;
      let endPage: number;
      
      if (currentPage <= 3) {
        // If current page is near the beginning
        startPage = 2;
        endPage = 5;
        pages.push(...Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i));
        pages.push("ellipsis-end");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        // If current page is near the end
        pages.push("ellipsis-start");
        startPage = totalPages - 4;
        endPage = totalPages - 1;
        pages.push(...Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i));
        pages.push(totalPages);
      } else {
        // Current page is in the middle
        pages.push("ellipsis-start");
        startPage = currentPage - 1;
        endPage = currentPage + 1;
        pages.push(...Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i));
        pages.push("ellipsis-end");
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <nav className="flex items-center space-x-1">
      <Button
        variant="outline"
        size="icon"
        onClick={handlePrevious}
        disabled={currentPage === 1}
        className="h-8 w-8"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="sr-only">Previous</span>
      </Button>
      
      {getPageNumbers().map((page, index) => 
        typeof page === "number" ? (
          <Button
            key={index}
            variant={currentPage === page ? "default" : "outline"}
            size="sm"
            onClick={() => onPageChange(page)}
            className="h-8 w-8"
          >
            {page}
          </Button>
        ) : (
          <span key={index} className="px-2 text-gray-500">
            ...
          </span>
        )
      )}
      
      <Button
        variant="outline"
        size="icon"
        onClick={handleNext}
        disabled={currentPage === totalPages}
        className="h-8 w-8"
      >
        <ChevronRight className="h-4 w-4" />
        <span className="sr-only">Next</span>
      </Button>
    </nav>
  );
};
