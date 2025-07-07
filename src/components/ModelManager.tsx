import { Filter, Info, Search } from 'lucide-react';

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import DownloadProgress from '@/components/DownloadProgress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import CustomSelect from '@/components/ui/custom-select';
import { Input } from '@/components/ui/input';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useTheme } from '@/contexts/ThemeContext';
import { useModelStore } from '@/stores/modelStore';

const ModelManager = () => {
  const { t } = useTranslation();
  const { currentTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState('popular');

  const {
    models,
    currentModel,
    isLoading,
    error,
    pagination,
    fetchModels,
    deleteModel,
    setCurrentModel,
  } = useModelStore();

  useEffect(() => {
    fetchModels(currentPage, searchQuery, selectedCategories, sortOrder);
  }, [fetchModels, currentPage, selectedCategories, sortOrder]);

  const modelCategories = [
    {
      value: 'embedding',
      className:
        'data-[state=on]:bg-green-500/20 data-[state=on]:text-green-300 data-[state=on]:border-green-500/30',
    },
    {
      value: 'vision',
      className:
        'data-[state=on]:bg-blue-500/20 data-[state=on]:text-blue-300 data-[state=on]:border-blue-500/30',
    },
    {
      value: 'tools',
      className:
        'data-[state=on]:bg-orange-500/20 data-[state=on]:text-orange-300 data-[state=on]:border-orange-500/30',
    },
    {
      value: 'thinking',
      className:
        'data-[state=on]:bg-purple-500/20 data-[state=on]:text-purple-300 data-[state=on]:border-purple-500/30',
    },
  ];

  const handleSearch = () => {
    setCurrentPage(1);
    fetchModels(1, searchQuery, selectedCategories, sortOrder);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchModels(page, searchQuery, selectedCategories, sortOrder);
  };

  const handleCategoryChange = (categories: string[]) => {
    setSelectedCategories(categories);
    setCurrentPage(1);
  };

  const handleSortChange = (value: string) => {
    setSortOrder(value);
    setCurrentPage(1);
  };

  const formatNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null) return '-';
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('en-US');
    } catch (e) {
      return '-';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'thinking':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'vision':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'embedding':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'tools':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      default:
        return 'bg-white/10 text-white/70 border-white/20';
    }
  };

  if (isLoading && models.length === 0) {
    return (
      <div className='flex-1 flex items-center justify-center'>
        <div className='text-white/70'>{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className='flex-1 flex flex-col h-full'>
      {/* Search and filter bar */}
      <div className='p-4 lg:p-6 border-b border-white/10 space-y-4 shrink-0'>
        {/* Search bar */}
        <div className='flex flex-col sm:flex-row items-start sm:items-center gap-4'>
          <div className='relative flex-1 max-w-md w-full'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-4 h-4' />
            <Input
              type='text'
              placeholder={t('models.searchPlaceholder')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleSearch()}
              className='pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none'
            />
          </div>
          <Button
            onClick={handleSearch}
            disabled={isLoading}
            className={`bg-gradient-to-r ${currentTheme.colors.primary} text-white border-0 hover:opacity-90 whitespace-nowrap px-8`}
          >
            {t('common.search')}
          </Button>
        </div>

        {/* Filter and sort */}
        <div className='flex flex-col lg:flex-row flex-wrap items-start lg:items-center gap-4'>
          {/* Type filter */}
          <div className='flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full lg:w-auto'>
            <div className='flex items-center gap-2'>
              <Filter className='w-4 h-4 text-white/70' />
              <span className='text-white/70 text-sm'>{t('models.type')}:</span>
            </div>
            <ToggleGroup
              type='multiple'
              value={selectedCategories}
              onValueChange={handleCategoryChange}
              className='gap-1 flex-wrap'
            >
              {modelCategories.map(category => (
                <ToggleGroupItem
                  key={category.value}
                  value={category.value}
                  size='sm'
                  className={`px-4 text-xs bg-white/5 border-white/20 text-white/90 hover:bg-white/10 hover:text-white ${category.className}`}
                >
                  {t(`models.${category.value}`)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          {/* Sort */}
          <div className='flex items-center gap-2'>
            <span className='text-white/70 text-sm'>{t('models.sort')}:</span>
            <CustomSelect
              value={sortOrder}
              onValueChange={handleSortChange}
              options={[
                { value: 'popular', label: t('models.popular') },
                { value: 'newest', label: t('models.newest') },
              ]}
              className='w-32'
              size='sm'
              variant='default'
            />
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className='flex-1 p-4 lg:p-6 overflow-hidden'>
        {error && (
          <div className='mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300'>
            {error}
          </div>
        )}

        {models.length === 0 && !isLoading ? (
          <Card className='bg-white/5 border-white/20'>
            <CardContent className='p-8 text-center'>
              <p className='text-white/70'>{t('models.noModelsFound')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className='h-full flex flex-col'>
            <div className='flex-1 overflow-hidden'>
              <ScrollArea className='h-full [&>[data-radix-scroll-area-viewport]]:!pr-0 custom-scrollbar'>
                <div className='min-w-full'>
                  <Table>
                    <TableHeader>
                      <TableRow className='border-white/20 hover:bg-white/5'>
                        <TableHead className='text-white/90 font-medium min-w-[150px]'>
                          {t('models.modelName')}
                        </TableHead>
                        <TableHead className='text-white/90 font-medium min-w-[200px] hidden md:table-cell'>
                          {t('models.description')}
                        </TableHead>
                        <TableHead className='text-white/90 font-medium min-w-[100px]'>
                          {t('models.type')}
                        </TableHead>
                        <TableHead className='text-white/90 font-medium min-w-[100px] hidden lg:table-cell'>
                          {t('models.specs')}
                        </TableHead>
                        <TableHead className='text-white/90 font-medium min-w-[80px] hidden xl:table-cell'>
                          {t('models.tags')}
                        </TableHead>
                        <TableHead className='text-white/90 font-medium min-w-[80px] hidden lg:table-cell'>
                          {t('models.downloads')}
                        </TableHead>
                        <TableHead className='text-white/90 font-medium min-w-[100px] hidden xl:table-cell'>
                          {t('models.updatedAt')}
                        </TableHead>
                        <TableHead className='text-white/90 font-medium min-w-[120px]'>
                          {t('models.actions')}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {models.map(model => (
                        <TableRow key={model.name} className='border-white/10 hover:bg-white/5'>
                          <TableCell>
                            <Link
                              to={`/models/${model.name}`}
                              className='font-medium text-sky-400 hover:underline'
                            >
                              {model.name}
                            </Link>
                          </TableCell>
                          <TableCell className='text-white/70 text-xs max-w-xs truncate hidden md:table-cell'>
                            {model.description}
                          </TableCell>
                          <TableCell className='text-white/70'>
                            <div className='flex flex-wrap gap-1'>
                              {model.types.map((type: string) => (
                                <Badge
                                  key={type}
                                  className={`${getTypeColor(type)} border text-xs`}
                                >
                                  {t(`models.types.${type.toLowerCase()}`, { defaultValue: type })}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className='text-white/70 hidden lg:table-cell'>
                            {model.specs}
                          </TableCell>
                          <TableCell className='text-white/70 text-sm hidden xl:table-cell'>
                            {model.tags}
                          </TableCell>
                          <TableCell className='text-white/70 text-sm hidden lg:table-cell'>
                            {formatNumber(model.downloads)}
                          </TableCell>
                          <TableCell className='text-white/70 text-sm hidden xl:table-cell'>
                            {formatDate(model.updatedAt)}
                          </TableCell>
                          <TableCell>
                            <div className='flex items-center gap-2'>
                              <Link to={`/models/${model.name}`}>
                                <Button
                                  size='sm'
                                  variant='ghost'
                                  className='px-2 py-1 h-auto bg-transparent text-white/70 hover:bg-white/10 hover:text-white'
                                >
                                  <Info className='w-4 h-4' />
                                </Button>
                              </Link>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            </div>

            {/* Pagination */}
            {pagination && pagination.total_pages > 1 && (
              <div className='flex justify-center items-center mt-6 shrink-0'>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href='#'
                        onClick={e => {
                          e.preventDefault();
                          if (currentPage > 1) handlePageChange(currentPage - 1);
                        }}
                        className={
                          currentPage === 1
                            ? 'pointer-events-none text-white/30'
                            : 'text-white/80 hover:text-white'
                        }
                      />
                    </PaginationItem>
                    {[...Array(pagination.total_pages)].map((_, i) => (
                      <PaginationItem key={i}>
                        <PaginationLink
                          href='#'
                          isActive={currentPage === i + 1}
                          onClick={e => {
                            e.preventDefault();
                            handlePageChange(i + 1);
                          }}
                          className={
                            currentPage === i + 1
                              ? `bg-gradient-to-r ${currentTheme.colors.primary} text-white border-0`
                              : 'text-white/80 hover:text-white'
                          }
                        >
                          {i + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        href='#'
                        onClick={e => {
                          e.preventDefault();
                          if (currentPage < pagination.total_pages)
                            handlePageChange(currentPage + 1);
                        }}
                        className={
                          currentPage === pagination.total_pages
                            ? 'pointer-events-none text-white/30'
                            : 'text-white/80 hover:text-white'
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Download progress toasts */}
      <div className='absolute bottom-4 right-4 space-y-2'>
        <DownloadProgress />
      </div>
    </div>
  );
};

export default ModelManager;
