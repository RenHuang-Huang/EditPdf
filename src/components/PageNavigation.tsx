import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RotateCw, RotateCcw, Search } from 'lucide-react';
import './PageNavigation.css';

interface PageNavigationProps {
    currentPage: number;
    totalPages: number;
    rotation: number;
    onPageChange: (page: number) => void;
    onRotate: (direction: 'cw' | 'ccw') => void;
    onSearch: (query: string) => void;
    searchQuery: string;
}

export const PageNavigation: React.FC<PageNavigationProps> = ({
    currentPage,
    totalPages,
    rotation,
    onPageChange,
    onRotate,
    onSearch,
    searchQuery
}) => {
    const [inputValue, setInputValue] = React.useState(currentPage.toString());

    React.useEffect(() => {
        setInputValue(currentPage.toString());
    }, [currentPage]);

    const handlePageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
    };

    const handlePageSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const page = parseInt(inputValue, 10);
        if (page >= 1 && page <= totalPages) {
            onPageChange(page);
        } else {
            setInputValue(currentPage.toString());
        }
    };

    const goToFirstPage = () => onPageChange(1);
    const goToLastPage = () => onPageChange(totalPages);
    const previousPage = () => onPageChange(Math.max(1, currentPage - 1));
    const nextPage = () => onPageChange(Math.min(totalPages, currentPage + 1));

    return (
        <div className="page-navigation">
            {/* 頁面導航控制 */}
            <div className="nav-buttons">
                <button
                    onClick={goToFirstPage}
                    disabled={currentPage === 1}
                    title="第一頁"
                    className="nav-btn"
                >
                    <ChevronsLeft size={18} />
                </button>
                <button
                    onClick={previousPage}
                    disabled={currentPage === 1}
                    title="上一頁 (←)"
                    className="nav-btn"
                >
                    <ChevronLeft size={18} />
                </button>

                <form onSubmit={handlePageSubmit} className="page-input-form">
                    <input
                        type="number"
                        className="page-input"
                        value={inputValue}
                        onChange={handlePageInput}
                        min={1}
                        max={totalPages}
                    />
                    <span className="page-total"> / {totalPages}</span>
                </form>

                <button
                    onClick={nextPage}
                    disabled={currentPage === totalPages}
                    title="下一頁 (→)"
                    className="nav-btn"
                >
                    <ChevronRight size={18} />
                </button>
                <button
                    onClick={goToLastPage}
                    disabled={currentPage === totalPages}
                    title="最後一頁"
                    className="nav-btn"
                >
                    <ChevronsRight size={18} />
                </button>
            </div>

            {/* 旋轉控制 */}
            <div className="rotation-buttons">
                <button
                    onClick={() => onRotate('ccw')}
                    title="逆時針旋轉"
                    className="nav-btn"
                >
                    <RotateCcw size={18} />
                </button>
                <button
                    onClick={() => onRotate('cw')}
                    title="順時針旋轉"
                    className="nav-btn"
                >
                    <RotateCw size={18} />
                </button>
                <span className="rotation-indicator">{rotation}°</span>
            </div>

            {/* 文字搜尋 */}
            <div className="search-box">
                <Search size={16} className="search-icon" />
                <input
                    type="text"
                    className="search-input"
                    placeholder="搜尋文字..."
                    value={searchQuery}
                    onChange={(e) => onSearch(e.target.value)}
                />
            </div>
        </div>
    );
};
