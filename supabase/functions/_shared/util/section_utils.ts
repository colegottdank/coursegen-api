import { Database } from "../database.types.ts";
import { ISection } from "../models/internal/ISection.ts";

export function buildNestedSections(sections: Database["public"]["Tables"]["section"]["Row"][]): INestedSection[] {
    const topLevelSections: INestedSection[] = [];
  
    const sectionMap = new Map<string, INestedSection>();
    sections.forEach((section) => {
      const nestedSection = mapSectionToNestedSection(section);
      sectionMap.set(nestedSection.path, nestedSection);
    });
  
    sections.forEach((section) => {
      const parentPath = section.path.substring(0, section.path.lastIndexOf('.'));
      const parent = sectionMap.get(parentPath);
      if (parent) {
        parent.children.push(mapSectionToNestedSection(section));
      } else {
        topLevelSections.push(mapSectionToNestedSection(section));
      }
    });
  
    return topLevelSections;
  }

function mapSectionToNestedSection(section: Database["public"]["Tables"]["section"]["Row"]): INestedSection {
    const nestedSection: INestedSection = {
        title: section.title,
        description: section.description,
        dates: section.dates ?? undefined,
        path: section.path,
        children: [],
    };
  
    return nestedSection;
  }

export interface INestedSection extends ISection {
  children: INestedSection[];
}
