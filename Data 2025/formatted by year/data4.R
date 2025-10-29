##
## data1: json for flows
## data2: json for flows by sex
## data3: json for flows by type
## data4: json for stocks
## data5: json for stocks by sex
##

library(tidyverse)
library(countrycode)
library(migest)
library(jsonlite)

f <- read_csv("../refilterbynumberoflinks/data/stock_undesa_ims2024.csv", guess_max = 1e6)
# f <- read_csv("https://ndownloader.figshare.com/files/33893906?private_link=d610aa95f97bb441c762")

d0 <- f %>%
  select(year, orig, dest, stock) %>%
  mutate(
    orig = countrycode(
      sourcevar = orig, custom_dict = dict_ims,
      origin = "iso3c", destination = "iso3c"),
    dest = countrycode(
      sourcevar = dest, custom_dict = dict_ims,
      origin = "iso3c", destination = "iso3c"),
    orig_area = countrycode(
      sourcevar = orig, custom_dict = dict_ims,
      origin = "iso3c", destination = "region_ac2022"),
    dest_area = countrycode(
      sourcevar = dest, custom_dict = dict_ims,
      origin = "iso3c", destination = "region_ac2022")) %>%
  select(-contains("code")) 

d1 <- d0 %>%
  group_by(year) %>%
  sum_expand(guess_order = TRUE, return_matrix = FALSE, flow_col = "stock")

# expand data frame to get consistent dimensions over all periods
d2 <- d1 %>%
  ungroup() %>%
  complete(orig, dest, year, fill = list(flow = 0))

# order of regions and countries, following latest plots
n0 <- unique(dict_ims$region_ac2022) %>%
  .[c(1, 2, 8, 3, 7, 6, 4, 5, 11, 9, 10)]

n1 <- tibble(lab0 = unique(d1$orig)) %>%
  mutate(area = ifelse(str_length(lab0) > 3, lab0, NA),
         lab1 = countrycode(sourcevar = lab0, custom_dict = dict_ims,
                            origin = "iso3c", destination = "name_short"),
         lab1 = stringi::stri_trans_general(str = lab1, id = "latin-ascii")) %>%
  fill(area) %>%
  mutate(area = factor(area, levels = n0)) %>%
  arrange(area, lab1) %>%
  mutate(lab1 = ifelse(is.na(lab1), as.character(area), lab1)) %>%
  group_by(area) %>%
  nest() %>%
  mutate(d = map(.x = data, .f = ~slice(.x, n(), 1:(n()-1)))) %>%
  select(-data) %>%
  unnest(d) %>%
  ungroup() %>%
  mutate(flag = countrycode(sourcevar = lab0, origin = "iso3c", destination = "unicode.symbol"))

# totals
d3a <- d1 %>%
  filter(orig %in% n0,
         dest %in% n0) %>%
  group_by(year) %>%
  sum_country() %>%
  select(-turn, -net) %>%
  ungroup()

d3b <- d1 %>%
  filter(!orig %in% n0,
         !dest %in% n0) %>%
  group_by(year) %>%
  sum_country() %>%
  select(-turn, -net) %>%
  ungroup() %>%
  mutate(
    country = countrycode(sourcevar = country, custom_dict = dict_ims,
                          origin = "iso3c", destination = "name_short"),
    country = stringi::stri_trans_general(str = country, id = "latin-ascii")
  )

d3 <- d3a %>%
  bind_rows(d3b) %>%
  mutate(country = factor(country, levels = n1$lab1)) %>%
  arrange(country)

# matrices
m <- d2 %>% 
  mutate(orig = factor(orig, levels = n1$lab0), 
         dest = factor(dest, levels = n1$lab0)) %>%
  arrange(year, orig, dest) %>%
  xtabs(formula = round(flow) ~ orig + dest + year, data = .,) %>%
  array_tree(margin = 3)

# threshold
threshold_value <- d0 %>%
  rename(flow = stock) %>%
  summarise(threshold = 50000) %>%
  pull(threshold)

# colours  
p <- colorRampPalette(migest::umbrella)(length(which(n1$area == n1$lab1)))

# Create stocks directory if it doesn't exist
if (!dir.exists("stocks")) {
  dir.create("stocks")
}

# Prepare meta data
total_inflow <- d3 %>%
  rename(dest = country) %>%
  select(year, dest, imm) %>%
  xtabs(formula = round(imm) ~ year + dest, data = .,) %>%
  as.matrix() %>%
  apply(2, max) %>%
  unname()

total_outflow <- d3 %>%
  rename(orig = country) %>%
  select(year, orig, emi) %>%
  xtabs(formula = round(emi) ~ year - orig, data = .,) %>%
  as.matrix() %>%
  apply(2, max) %>%
  unname()

years <- names(m)

meta <- list(
  threshold = threshold_value,
  years = years,
  max_total_inflow = total_inflow,
  max_total_outflow = total_outflow
  # names = n1$lab1,
  # flags = n1$flag,
  # regions = which(n1$area == n1$lab1) - 1,
  # colours = p
)

# Save meta.json
write_json(meta, file.path("stocks", "dataset_meta.json"), auto_unbox = TRUE, pretty = TRUE)

# Process each year

for (year in years) {
  # Create JSON with just the matrix
  matrix_data <- list(matrix = m[[year]])
  
  # Save as year.json
  write_json(matrix_data, file.path("stocks", paste0(year, ".json")), 
             auto_unbox = TRUE, pretty = TRUE)
}




# mm <- j$matrix$`1990`
# dimnames(mm) <- list(orig = j$names, dest = j$names)
# mm <- t(mm)
# mm[1:5,1:5]
# m %>% 
#   filter(orig == "SCG")
# m["SCG", ]
