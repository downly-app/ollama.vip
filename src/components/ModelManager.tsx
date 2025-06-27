import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Trash2, Play, RefreshCw, Search, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import CustomSelect from '@/components/ui/custom-select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { useModelStore } from '@/stores/modelStore';
import { useTheme } from '@/contexts/ThemeContext';
import DownloadProgress from '@/components/DownloadProgress';
import { useDownloadManager } from '@/hooks/useDownloadManager';

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
    downloadModel, 
    deleteModel, 
    setCurrentModel 
  } = useModelStore();
  const { downloads, startDownload, cancelDownload, dismissDownload } = useDownloadManager();

  useEffect(() => {
    fetchModels(currentPage, searchQuery, selectedCategories, sortOrder);
  }, [fetchModels, currentPage, selectedCategories, sortOrder]);

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

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US');
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'thinking': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'vision': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'embedding': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'tools': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      default: return 'bg-white/10 text-white/70 border-white/20';
    }
  };

  const handleModelAction = async (modelName: string, action: 'download' | 'delete' | 'select') => {
    switch (action) {
      case 'download':
        startDownload(modelName);
        break;
      case 'delete':
        await deleteModel(modelName);
        break;
      case 'select':
        setCurrentModel(modelName);
        break;
    }
  };

  if (isLoading && models.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-white/70">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Search and filter bar */}
      <div className="p-4 lg:p-6 border-b border-white/10 space-y-4 shrink-0">
        {/* Search bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-4 h-4" />
            <Input
              type="text"
              placeholder={t('models.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none"
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
        <div className="flex flex-col lg:flex-row flex-wrap items-start lg:items-center gap-4">
          {/* Type filter */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full lg:w-auto">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-white/70" />
              <span className="text-white/70 text-sm">{t('models.type')}:</span>
            </div>
            <ToggleGroup 
              type="multiple" 
              value={selectedCategories} 
              onValueChange={handleCategoryChange}
              className="gap-1 flex-wrap"
            >
              <ToggleGroupItem 
                value="embedding" 
                size="sm"
                className="text-xs bg-white/5 border-white/20 text-white/90 data-[state=on]:bg-green-500/20 data-[state=on]:text-green-300 data-[state=on]:border-green-500/30"
              >
                Embedding
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="vision" 
                size="sm"
                className="text-xs bg-white/5 border-white/20 text-white/90 data-[state=on]:bg-blue-500/20 data-[state=on]:text-blue-300 data-[state=on]:border-blue-500/30"
              >
                Vision
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="tools" 
                size="sm"
                className="text-xs bg-white/5 border-white/20 text-white/90 data-[state=on]:bg-orange-500/20 data-[state=on]:text-orange-300 data-[state=on]:border-orange-500/30"
              >
                Tools
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="thinking" 
                size="sm"
                className="text-xs bg-white/5 border-white/20 text-white/90 data-[state=on]:bg-purple-500/20 data-[state=on]:text-purple-300 data-[state=on]:border-purple-500/30"
              >
                Thinking
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <span className="text-white/70 text-sm">{t('models.sort')}:</span>
            <CustomSelect
              value={sortOrder}
              onValueChange={handleSortChange}
              options={[
                { value: 'popular', label: t('models.popular') },
                { value: 'newest', label: t('models.newest') }
              ]}
              className="w-32"
              size="sm"
              variant="default"
            />
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 p-4 lg:p-6 overflow-hidden">
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300">
            {error}
          </div>
        )}

        {models.length === 0 && !isLoading ? (
          <Card className="bg-white/5 border-white/20">
            <CardContent className="p-8 text-center">
              <p className="text-white/70">{t('models.noModelsFound')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full [&>[data-radix-scroll-area-viewport]]:!pr-0 custom-scrollbar">
                <div className="min-w-full">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/20 hover:bg-white/5">
                        <TableHead className="text-white/90 font-medium min-w-[150px]">{t('models.modelName')}</TableHead>
                        <TableHead className="text-white/90 font-medium min-w-[200px] hidden md:table-cell">{t('models.description')}</TableHead>
                        <TableHead className="text-white/90 font-medium min-w-[100px]">{t('models.type')}</TableHead>
                        <TableHead className="text-white/90 font-medium min-w-[100px] hidden lg:table-cell">{t('models.specs')}</TableHead>
                        <TableHead className="text-white/90 font-medium min-w-[80px] hidden xl:table-cell">{t('models.tags')}</TableHead>
                        <TableHead className="text-white/90 font-medium min-w-[80px] hidden lg:table-cell">{t('models.downloads')}</TableHead>
                        <TableHead className="text-white/90 font-medium min-w-[100px] hidden xl:table-cell">{t('models.updatedAt')}</TableHead>
                        <TableHead className="text-white/90 font-medium min-w-[120px]">{t('models.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {models.map((model) => (
                        <TableRow key={model.name} className="border-white/10 hover:bg-white/5">
                          <TableCell>
                            <Link 
                              to={`/model/${model.name}`}
                              className="font-bold text-white text-sm hover:text-white/80 transition-colors"
                            >
                              {model.name}
                            </Link>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="max-w-xs text-white/70 text-sm truncate" title={model.description}>
                              {model.description}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {model.types.map((type) => (
                                <Badge key={type} className={`${getTypeColor(type)} border text-xs`}>
                                  {type}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div className="text-white/70 text-sm">
                              {model.sizes.join(', ')}
                            </div>
                          </TableCell>
                          <TableCell className="hidden xl:table-cell">
                            <div className="text-white/70 text-sm">
                              {model.tags}
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div className="text-white/70 text-sm">
                              {formatNumber(model.pulls)}
                            </div>
                          </TableCell>
                          <TableCell className="hidden xl:table-cell">
                            <div className="text-white/70 text-sm">
                              {formatDate(model.updated_at)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {model.status === 'downloading' && model.downloadProgress !== undefined ? (
                                <div className="flex items-center gap-2 min-w-[120px]">
                                  <Progress value={model.downloadProgress} className="h-2 bg-white/20 flex-1" />
                                  <span className="text-xs text-white">{model.downloadProgress}%</span>
                                </div>
                              ) : model.isLocal ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant={currentModel === model.name ? "default" : "outline"}
                                    onClick={() => handleModelAction(model.name, 'select')}
                                    className={currentModel === model.name ? 
                                      `bg-gradient-to-r ${currentTheme.colors.primary} text-white border-0 hover:opacity-90 text-xs` : 
                                      "border-white/30 text-white/90 hover:bg-white/10 hover:text-white bg-white/5 text-xs"
                                    }
                                  >
                                    <Play size={12} className="mr-1" />
                                    {currentModel === model.name ? t('models.selected') : t('models.select')}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleModelAction(model.name, 'delete')}
                                    className="border-red-500/30 text-red-400 hover:bg-red-500/20 hover:border-red-500/50 bg-red-500/10 text-xs"
                                  >
                                    <Trash2 size={12} className="mr-1" />
                                    {t('common.delete')}
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => handleModelAction(model.name, 'download')}
                                  disabled={model.status === 'downloading'}
                                  className={`bg-gradient-to-r ${currentTheme.colors.primary} text-white border-0 hover:opacity-90 disabled:opacity-50 text-xs`}
                                >
                                  <Download size={12} className="mr-1" />
                                  {t('models.download')}
                                </Button>
                              )}
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
              <div className="mt-6 flex justify-center shrink-0">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => pagination.has_previous && handlePageChange(currentPage - 1)}
                        className={`text-white hover:bg-white/10 ${!pagination.has_previous ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                      const pageNum = Math.max(1, currentPage - 2) + i;
                      if (pageNum > pagination.total_pages) return null;
                      
                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            onClick={() => handlePageChange(pageNum)}
                            isActive={pageNum === currentPage}
                            className={`text-white hover:bg-white/10 cursor-pointer ${
                              pageNum === currentPage ? `bg-gradient-to-r ${currentTheme.colors.primary}` : ''
                            }`}
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => pagination.has_next && handlePageChange(currentPage + 1)}
                        className={`text-white hover:bg-white/10 ${!pagination.has_next ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        )}
      </div>
      
      <DownloadProgress 
        downloads={downloads}
        onCancel={cancelDownload}
        onDismiss={dismissDownload}
      />
    </div>
  );
};

export default ModelManager;
