library(tidyverse)
dd <- read.csv("Flow Datn_name) %>%
    summarize(origin_name,originregion_name) %>%
    unique()
write.csv(dd2,"country-metadata.csva for Online Viz Version2.csv",header=T)
names(dd)
dd2 <- dd %>% 
    group_by(origin_iso,originregio")



