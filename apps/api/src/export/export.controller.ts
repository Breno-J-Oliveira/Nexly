import { Controller, Get, Res, Query } from "@nestjs/common";
import { Response } from "express";
import { ExportService } from "./export.service";

@Controller("export")
export class ExportController {
  constructor(private readonly service: ExportService) {}

  @Get("vendas/csv")
  async vendasCsv(@Res() res: Response, @Query("dataInicio") di?: string, @Query("dataFim") df?: string){
    var csv=await this.service.vendasCsv(di,df);
    res.setHeader("Content-Type","text/csv; charset=utf-8");
    res.setHeader("Content-Disposition","attachment; filename=vendas-nexly.csv");
    res.send("﻿"+csv);
  }

  @Get("produtos/vencendo")
  async vencendo(@Query("dias") dias?: string){
    return this.service.produtosVencendo(Number(dias||30));
  }
}
