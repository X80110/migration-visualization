library(tidyverse)

dd <- read.csv("Flow Datn_name.csv") %>%
    summarize(origin_name,originregion_name) %>%
    unique()

dda <- read.csv("/Users/xavier/Desktop/migration-boilerplate/data/gf_od.csv") %>%
    summarize(orig) %>%
    unique() %>%
    group_by(orig)
    
length(dda$orig)
write.csv(dd2,"country-metadata.csva for Online Viz Version2.csv",header=T)
names(dd)
dd2 <- dd %>% 
    group_by(origin_iso,originregio")

