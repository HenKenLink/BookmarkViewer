import React, { Suspense, lazy } from 'react';

// Dynamically import the components and styles only when needed
const PhotoProvider = lazy(() => import('react-photo-view').then(module => {
  import('react-photo-view/dist/react-photo-view.css');
  return { default: module.PhotoProvider };
}));

const PhotoView = lazy(() => import('react-photo-view').then(module => ({ default: module.PhotoView })));

interface LazyPhotoProviderProps {
  children: React.ReactNode;
  maskOpacity?: number;
  bannerVisible?: boolean;
  speed?: () => number;
}

export const LazyPhotoProvider: React.FC<LazyPhotoProviderProps> = ({ 
  children, 
  maskOpacity = 0.8, 
  bannerVisible = false,
  speed = () => 0
}) => {
  return (
    <Suspense fallback={<>{children}</>}>
      <PhotoProvider 
        maskOpacity={maskOpacity} 
        bannerVisible={bannerVisible}
        speed={speed}
      >
        {children}
      </PhotoProvider>
    </Suspense>
  );
};

export const LazyPhotoView: React.FC<{ src: string; children: React.ReactElement }> = ({ src, children }) => {
  return (
    <Suspense fallback={children}>
      <PhotoView src={src}>
        {children}
      </PhotoView>
    </Suspense>
  );
};
