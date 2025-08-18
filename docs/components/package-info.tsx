import React from 'react';
import { NPM_PACKAGE_NAME, NPM_PACKAGE_URI, GITHUB_REPO_URI } from '../config/constants';

interface PackageInfoProps {
  type: 'npm-install' | 'import' | 'package-name' | 'npm-link' | 'package-json' | 'workspace';
  className?: string;
  children?: React.ReactNode;
}

export const PackageInfo: React.FC<PackageInfoProps> = ({ 
  type, 
  className = '',
  children 
}) => {
  const renderContent = () => {
    switch (type) {
      case 'npm-install':
        return `npm install ${NPM_PACKAGE_NAME}`;
      case 'import':
        return `import { geoai } from "${NPM_PACKAGE_NAME}";`;
      case 'package-name':
        return NPM_PACKAGE_NAME;
      case 'npm-link':
        return `npm link ${NPM_PACKAGE_NAME}`;
      case 'package-json':
        return `"${NPM_PACKAGE_NAME}": "workspace:*"`;
      case 'workspace':
        return `"name": "${NPM_PACKAGE_NAME}-workspace"`;
      default:
        return NPM_PACKAGE_NAME;
    }
  };

  return (
    <code className={className}>
      {children || renderContent()}
    </code>
  );
};

// Convenience components for common use cases
export const NpmInstall: React.FC<{ className?: string }> = ({ className }) => (
  <PackageInfo type="npm-install" className={className} />
);

export const ImportStatement: React.FC<{ className?: string }> = ({ className }) => (
  <PackageInfo type="import" className={className} />
);

export const PackageName: React.FC<{ className?: string }> = ({ className }) => (
  <PackageInfo type="package-name" className={className} />
);

export const NpmLink: React.FC<{ className?: string }> = ({ className }) => (
  <PackageInfo type="npm-link" className={className} />
);

export const PackageJson: React.FC<{ className?: string }> = ({ className }) => (
  <PackageInfo type="package-json" className={className} />
);

export const WorkspaceName: React.FC<{ className?: string }> = ({ className }) => (
  <PackageInfo type="workspace" className={className} />
);
