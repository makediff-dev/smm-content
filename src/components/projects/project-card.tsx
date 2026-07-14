"use client";

import Link from "next/link";
import type { Project } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import styles from "./project-card.module.css";

interface ProjectCardProps {
  project: Project;
  recentGenerations: string[];
  managerNames: string[];
}

export function ProjectCard({
  project,
  recentGenerations,
  managerNames,
}: ProjectCardProps) {
  return (
    <Card variant="interactive" className={styles.card}>
      <div className={styles.header}>
        <div className={styles.logoBox}>{project.logoPlaceholder}</div>
        <div>
          <div className={styles.name}>{project.name}</div>
          <div className={styles.meta}>
            {project.contentCount} контент-единиц
          </div>
        </div>
      </div>

      {recentGenerations.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Последние генерации</div>
          <div className={styles.generations}>
            {recentGenerations.map((g, i) => (
              <div key={i}>— {g}</div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.sectionLabel}>Менеджеры</div>
        <div>
          {managerNames.map((name) => (
            <span key={name} className={styles.tag}>{name}</span>
          ))}
          {managerNames.length === 0 && (
            <span className={styles.tag}>—</span>
          )}
        </div>
      </div>

      <div className={styles.footer}>
        <Link href={`/projects/${project.id}`}>
          <Button variant="secondary" fullWidth>
            Открыть проект
          </Button>
        </Link>
      </div>
    </Card>
  );
}
